import hashlib
import secrets
from datetime import timedelta

import jwt
import redis
from argon2 import PasswordHasher
from fastapi import Cookie, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db, utcnow
from app.models import RefreshToken, User
from app.shared.infrastructure.redis_gateway import RedisGateway

password_hasher = PasswordHasher()
ACCESS_MINUTES = 15
REFRESH_DAYS = 30
COOKIE_NAME = "portfolio_refresh"


def hash_refresh(token: str) -> str:
    return hashlib.sha256((settings.refresh_token_pepper + token).encode()).hexdigest()


def access_token(user: User) -> str:
    return jwt.encode({"sub": user.id, "exp": utcnow() + timedelta(minutes=ACCESS_MINUTES)}, settings.jwt_secret, algorithm="HS256")


def issue_refresh(db: Session, user: User, response: Response, request: Request) -> None:
    token = secrets.token_urlsafe(48)
    db.add(RefreshToken(user_id=user.id, token_hash=hash_refresh(token), expires_at=utcnow() + timedelta(days=REFRESH_DAYS), user_agent=request.headers.get("user-agent", "")[:500], ip_address=request.client.host if request.client else None))
    response.set_cookie(COOKIE_NAME, token, max_age=REFRESH_DAYS * 86400, httponly=True, secure=settings.cookie_secure, samesite="lax", path="/api/v1/auth")


def clear_refresh(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/api/v1/auth")


def rate_limit(key: str, limit: int, seconds: int) -> None:
    try:
        if not RedisGateway(settings.redis_url).check(key, limit, seconds):
            raise HTTPException(429, "Rate limit exceeded")
    except redis.RedisError:
        raise HTTPException(503, "Rate limiter unavailable") from None


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    authorization = request.headers.get("authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")
    try:
        payload = jwt.decode(authorization[7:], settings.jwt_secret, algorithms=["HS256"])
        user = db.get(User, payload["sub"])
    except (jwt.PyJWTError, KeyError):
        raise HTTPException(401, "Invalid access token") from None
    if user is None or not user.is_active:
        raise HTTPException(401, "Inactive user")
    db.info["actor_id"] = user.id
    db.info["ip_address"] = request.client.host if request.client else None
    return user


def active_refresh(token: str | None, db: Session) -> RefreshToken:
    if not token:
        raise HTTPException(401, "Missing refresh token")
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_refresh(token)).with_for_update())
    if record is None or record.revoked_at or record.expires_at <= utcnow():
        raise HTTPException(401, "Invalid refresh token")
    return record
