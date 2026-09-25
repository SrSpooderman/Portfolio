from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import User
from app.security import current_user


def test_component_graph_rejects_indirect_cycles():
    engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        user = User(email="components@example.test", username="components", password_hash="hash")
        db.add(user)
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
        client = TestClient(app)
        component_a = client.post("/api/v1/admin/components", json={"name": "A", "key": "component-a"}).json()["document"]
        component_b = client.post("/api/v1/admin/components", json={"name": "B", "key": "component-b"}).json()["document"]
        first = client.post(f"/api/v1/admin/documents/{component_a['id']}/component-instances", headers={"If-Match": str(component_a["revision"])}, json={"component_document_id": component_b["id"]})
        assert first.status_code == 201, first.text
        cycle = client.post(f"/api/v1/admin/documents/{component_b['id']}/component-instances", headers={"If-Match": str(component_b["revision"])}, json={"component_document_id": component_a["id"]})
        assert cycle.status_code == 422
        assert "cycle" in cycle.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
