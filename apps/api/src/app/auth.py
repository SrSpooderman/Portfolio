from pydantic import BaseModel
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from argon2.exceptions import VerifyMismatchError

from app.db import get_db, utcnow
from app.audit import record as audit_record
from app.models import RefreshToken, User
from app.security import COOKIE_NAME, access_token, active_refresh, clear_refresh, current_user, hash_refresh, issue_refresh, password_hasher, rate_limit
from app.serialization import row

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class Login(BaseModel):
    email: str
    password: str


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


@router.post("/login")
def login(body: Login, request: Request, response: Response, db: Session = Depends(get_db)):
    rate_limit("login:" + (request.client.host if request.client else "unknown"), 5, 60)
    user = db.scalar(select(User).where(User.email == body.email))
    try:
        valid = bool(user and user.is_active and password_hasher.verify(user.password_hash, body.password))
    except VerifyMismatchError:
        valid = False
    if not valid:
        audit_record(db, "AUTH_FAILED_LOGIN", request)
        db.commit()
        raise HTTPException(401, "Invalid credentials")
    user.last_login_at = utcnow()
    issue_refresh(db, user, response, request)
    audit_record(db, "AUTH_LOGIN", request, user_id=user.id, entity_type="users", entity_id=user.id)
    db.commit()
    return {"access_token": access_token(user), "user": {"id": user.id, "email": user.email, "username": user.username}}


@router.post("/refresh")
def refresh(request: Request, response: Response, portfolio_refresh: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    rate_limit("refresh:" + (request.client.host if request.client else "unknown"), 120, 60)
    record = active_refresh(portfolio_refresh, db)
    user = db.get(User, record.user_id)
    if user is None or not user.is_active:
        raise HTTPException(401, "Inactive user")
    record.revoked_at = utcnow()
    record.last_used_at = utcnow()
    issue_refresh(db, user, response, request)
    audit_record(db, "REFRESH_TOKEN_ROTATED", request, user_id=user.id, entity_type="refresh_tokens", entity_id=record.id)
    db.commit()
    return {"access_token": access_token(user)}


@router.post("/logout")
def logout(request: Request, response: Response, portfolio_refresh: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    if portfolio_refresh:
        record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_refresh(portfolio_refresh)))
        if record:
            record.revoked_at = utcnow()
            audit_record(db, "AUTH_LOGOUT", request, user_id=record.user_id, entity_type="refresh_tokens", entity_id=record.id)
            db.commit()
    clear_refresh(response)
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(current_user)):
    return {"id": user.id, "email": user.email, "username": user.username, "is_superadmin": user.is_superadmin}


@router.patch("/password")
def change_password(body: PasswordChange, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        valid = password_hasher.verify(user.password_hash, body.old_password)
    except VerifyMismatchError:
        valid = False
    if not valid or len(body.new_password) < 12:
        raise HTTPException(400, "Invalid password or password too short")
    user.password_hash = password_hasher.hash(body.new_password)
    db.execute(update(RefreshToken).where(RefreshToken.user_id == user.id).values(revoked_at=utcnow()))
    audit_record(db, "PASSWORD_CHANGED", request, user_id=user.id, entity_type="users", entity_id=user.id)
    db.commit()
    return {"ok": True}


@router.get("/sessions")
def sessions(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [{key: value for key, value in row(item).items() if key != "token_hash"} for item in db.scalars(select(RefreshToken).where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None), RefreshToken.expires_at > utcnow())).all()]


@router.delete("/sessions/{session_id}")
def revoke(session_id: str, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    token = db.get(RefreshToken, session_id)
    if token is None or token.user_id != user.id:
        raise HTTPException(404)
    token.revoked_at = utcnow()
    audit_record(db, "REFRESH_TOKEN_REVOKED", request, user_id=user.id, entity_type="refresh_tokens", entity_id=token.id)
    db.commit()
    return {"ok": True}


@router.post("/logout-all")
def logout_all(request: Request, response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.execute(update(RefreshToken).where(RefreshToken.user_id == user.id).values(revoked_at=utcnow()))
    audit_record(db, "ALL_REFRESH_TOKENS_REVOKED", request, user_id=user.id, entity_type="users", entity_id=user.id)
    db.commit()
    clear_refresh(response)
    return {"ok": True}
