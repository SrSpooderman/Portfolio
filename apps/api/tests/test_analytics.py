from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import AnalyticsEvent, Publication, User
from app.security import current_user


def test_analytics_filters_are_applied_in_database():
    engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        user = User(email="analytics@example.test", username="analytics", password_hash="hash")
        db.add(user)
        db.flush()
        db.add_all([
            AnalyticsEvent(event_type="page_view", occurred_at=datetime(2026, 9, 1), page_id="page-one"),
            AnalyticsEvent(event_type="click", occurred_at=datetime(2026, 9, 2), page_id="page-two"),
            AnalyticsEvent(event_type="click", occurred_at=datetime(2026, 9, 2), page_id="page-two", metadata_json={"traffic": "bot"}),
        ])
        db.commit()
        user_id = user.id

    def session_override():
        with Session(engine) as db:
            yield db

    def user_override():
        with Session(engine) as db:
            return db.get(User, user_id)

    app.dependency_overrides[get_db] = session_override
    app.dependency_overrides[current_user] = user_override
    try:
        result = TestClient(app).get("/api/v1/admin/analytics/overview", params={"from": "2026-09-02T00:00:00", "page_id": "page-two"})
        assert result.status_code == 200, result.text
        assert result.json() == {"total": 1, "visitors": 0, "page_views": 0, "project_views": 0, "external_clicks": 1, "by_type": {"click": 1}, "by_device": {}, "by_browser": {}}
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def test_publication_reference_is_exact_and_enriched(monkeypatch):
    engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        user = User(email="publisher@example.test", username="publisher", password_hash="hash")
        db.add(user)
        db.flush()
        db.add_all([
            Publication(version_number=1, content_hash="a" * 64, filename="v1-aaaaaaaaaaaa.json", snapshot={"pages": {}, "projects": {}}, status="READY", created_by=user.id),
            Publication(version_number=10, content_hash="b" * 64, filename="v10-bbbbbbbbbbbb.json", snapshot={"pages": {}, "projects": {}}, status="READY", created_by=user.id),
        ])
        db.commit()

    def session_override():
        with Session(engine) as db:
            yield db

    from app import analytics
    monkeypatch.setattr(analytics, "rate_limit", lambda *args: None)
    monkeypatch.setattr(analytics, "redis_counter", lambda *args: None)
    app.dependency_overrides[get_db] = session_override
    try:
        client = TestClient(app)
        event = {"event_id": "00000000-0000-0000-0000-000000000101", "event_type": "github_click", "publication": "v1-aaaaaaaaaaaa"}
        response = client.post("/api/v1/public/analytics/events", json=event, headers={"user-agent": "Mozilla/5.0 Chrome/120 Mobile", "cf-ipcountry": "ES"})
        assert response.status_code == 202, response.text
        bad = client.post("/api/v1/public/analytics/events", json={**event, "event_id": "00000000-0000-0000-0000-000000000102", "publication": "v1-bbbbbb"})
        assert bad.status_code == 422
        with Session(engine) as db:
            stored = db.scalar(select(AnalyticsEvent).where(AnalyticsEvent.event_id == event["event_id"]))
            publication = db.scalar(select(Publication).where(Publication.version_number == 1))
            assert stored.publication_id == publication.id
            assert stored.device_type == "mobile"
            assert stored.browser_family == "Chrome"
            assert stored.country_code == "ES"
            assert stored.metadata_json == {"traffic": "human-like"}
            assert stored.visitor_key
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
