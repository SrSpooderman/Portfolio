from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import auth
from app.config import settings
from app.db import Base, get_db
from app.main import app
from app.models import AuditEvent, User
from app.security import password_hasher


def test_login_refresh_rotation_and_logout(monkeypatch):
    engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(User(email="owner@example.test", username="owner", password_hash=password_hasher.hash("a-long-test-password"), is_active=True))
        db.commit()

    def session_override():
        with Session(engine) as db:
            yield db

    monkeypatch.setattr(auth, "rate_limit", lambda *args: None)
    monkeypatch.setattr(settings, "cookie_secure", False)
    app.dependency_overrides[get_db] = session_override
    client = TestClient(app)
    try:
        login = client.post("/api/v1/auth/login", json={"email": "owner@example.test", "password": "a-long-test-password"})
        assert login.status_code == 200, login.text
        token = login.json()["access_token"]
        assert client.get("/api/v1/auth/me", headers={"Authorization": "Bearer " + token}).status_code == 200
        first_cookie = client.cookies.get("portfolio_refresh")
        refreshed = client.post("/api/v1/auth/refresh")
        assert refreshed.status_code == 200, refreshed.text
        assert client.cookies.get("portfolio_refresh") != first_cookie
        assert client.post("/api/v1/auth/logout").status_code == 200
        assert client.post("/api/v1/auth/refresh").status_code == 401
        assert client.post("/api/v1/auth/login", json={"email": "owner@example.test", "password": "wrong-password"}).status_code == 401
        with Session(engine) as db:
            actions = set(db.scalars(select(AuditEvent.action)))
            assert {"AUTH_LOGIN", "REFRESH_TOKEN_ROTATED", "AUTH_LOGOUT", "AUTH_FAILED_LOGIN"} <= actions
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
