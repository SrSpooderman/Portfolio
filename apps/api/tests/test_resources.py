from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import resources
from app.db import Base, get_db
from app.main import app
from app.models import User
from app.security import current_user


def test_resource_validation_and_reference_guards(monkeypatch):
    engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        user = User(email="resources@example.test", username="resources", password_hash="hash")
        db.add(user)
        db.commit()
        user_id = user.id

    def session_override():
        with Session(engine) as db:
            yield db

    def user_override():
        with Session(engine) as db:
            db.info["actor_id"] = user_id
            return db.get(User, user_id)

    monkeypatch.setattr(resources, "invalidate_redirects", lambda *args: None)
    app.dependency_overrides[get_db] = session_override
    app.dependency_overrides[current_user] = user_override
    try:
        client = TestClient(app)
        missing = client.post("/api/v1/admin/projects", json={"title": "Incomplete"})
        assert missing.status_code == 422
        assert missing.json()["code"] == "HTTP_ERROR"
        invalid_template = client.post("/api/v1/admin/templates", json={"name": "Broken", "template_type": "SECTION", "snapshot": {"schema_version": 1, "root_id": "missing", "nodes": []}})
        assert invalid_template.status_code == 422

        link = client.post("/api/v1/admin/tracked-links", json={"name": "GitHub", "slug": "github", "destination_url": "https://github.com/example", "tracking_enabled": True, "is_enabled": True})
        assert link.status_code == 201, link.text
        link_id = link.json()["id"]
        page = client.post("/api/v1/admin/pages", json={"title": "Home", "slug": "home", "is_home": True}).json()
        node = client.post(f"/api/v1/admin/documents/{page['document']['id']}/nodes", headers={"If-Match": str(page["document"]["revision"])}, json={"node_type": "LINK", "props": {"text": "GitHub", "tracked_link_id": link_id}})
        assert node.status_code == 201, node.text
        blocked = client.delete(f"/api/v1/admin/tracked-links/{link_id}")
        assert blocked.status_code == 409
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
