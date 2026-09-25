import json

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.config import settings
from app import analytics
from app.db import Base, get_db
from app.main import app
from app.models import User
from app.security import current_user


def test_create_edit_publish_and_rollback(tmp_path, monkeypatch):
    engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    settings.publication_path = tmp_path
    monkeypatch.setattr(analytics, "rate_limit", lambda *args: None)
    with Session(engine) as db:
        user = User(email="admin@example.test", username="admin", password_hash="hash", is_superadmin=True)
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
    client = TestClient(app)
    try:
        response = client.post("/api/v1/admin/pages", json={"title": "Inicio", "slug": "inicio", "is_home": True})
        assert response.status_code == 201, response.text
        document = response.json()
        document_id = document["document"]["id"]
        revision = document["document"]["revision"]
        response = client.post(f"/api/v1/admin/documents/{document_id}/nodes", headers={"If-Match": str(revision)}, json={"node_type": "SECTION", "props": {}, "position": 10})
        assert response.status_code == 201, response.text
        section_id = response.json()["node"]["id"]
        revision = response.json()["revision"]
        response = client.post(f"/api/v1/admin/documents/{document_id}/nodes", headers={"If-Match": str(revision)}, json={"node_type": "HEADING", "parent_id": section_id, "props": {"text": "Hola", "tag": "h1"}, "position": 10})
        assert response.status_code == 201, response.text
        revision = response.json()["revision"]
        conflict = client.patch(f"/api/v1/admin/nodes/{section_id}", headers={"If-Match": str(revision - 1)}, json={"props": {"foo": "bar"}})
        assert conflict.status_code == 409
        publication = client.post("/api/v1/admin/publications", json={"activate": True})
        assert publication.status_code == 201, publication.text
        pointer = json.loads((tmp_path / "current.json").read_text())
        snapshot = json.loads((tmp_path / pointer["url"].split("/")[-1]).read_text())
        assert snapshot["pages"]["/"]["rootNodes"] == [section_id]
        assert snapshot["nodes"][response.json()["node"]["id"]]["props"]["text"] == "Hola"
        event = {"event_id": "00000000-0000-0000-0000-000000000042", "event_type": "page_view", "publication": "v1", "page_id": document_id}
        assert client.post("/api/v1/public/analytics/events", json=event).status_code == 202
        assert client.post("/api/v1/public/analytics/events", json=event).status_code == 202
        assert client.put("/api/v1/admin/portfolio-state/active-publication", json={"publication_id": publication.json()["publication"]["id"]}).status_code == 200
        component_response = client.post("/api/v1/admin/components", json={"name": "Cabecera", "key": "cabecera", "source_node_id": section_id})
        assert component_response.status_code == 201, component_response.text
        component_id = component_response.json()["document"]["id"]
        component_heading_id = next(item["id"] for item in component_response.json()["nodes"].values() if item["node_type"] == "HEADING")
        instance_response = client.post(f"/api/v1/admin/documents/{document_id}/component-instances", headers={"If-Match": str(revision)}, json={"component_document_id": component_id})
        assert instance_response.status_code == 201, instance_response.text
        instance_id = instance_response.json()["node"]["id"]
        override = client.patch(f"/api/v1/admin/component-instances/{instance_id}/nodes/{component_heading_id}", headers={"If-Match": str(instance_response.json()["revision"])}, json={"props_override": {"text": "Editado"}})
        assert override.status_code == 200, override.text
        document_with_override = client.get(f"/api/v1/admin/documents/{document_id}").json()
        assert document_with_override["nodes"][instance_id]["component_overrides"][component_heading_id]["props_override"] == {"text": "Editado"}
        second = client.post("/api/v1/admin/publications", json={"activate": True})
        assert second.status_code == 201, second.text
        second_snapshot = second.json()["publication"]["snapshot"]
        assert instance_id in second_snapshot["nodes"]
        assert any(key.startswith(instance_id + ":") for key in second_snapshot["nodes"])
        assert second_snapshot["nodes"][f"{instance_id}:{component_heading_id}"]["props"]["text"] == "Editado"
        rollback = client.put("/api/v1/admin/portfolio-state/active-publication", json={"publication_id": publication.json()["publication"]["id"]})
        assert rollback.status_code == 200
        assert json.loads((tmp_path / "current.json").read_text())["version"] == 1
        duplicate = client.post(f"/api/v1/admin/nodes/{instance_id}/duplicates", headers={"If-Match": str(override.json()["revision"])})
        assert duplicate.status_code == 201, duplicate.text
        duplicate_id = duplicate.json()["root_id"]
        removed = client.delete(f"/api/v1/admin/nodes/{duplicate_id}", headers={"If-Match": str(duplicate.json()["revision"])})
        assert removed.status_code == 200, removed.text
        before_structural_undo = client.get(f"/api/v1/admin/documents/{document_id}").json()
        without_instance = [node for node in before_structural_undo["nodes"].values() if node["id"] != instance_id]
        replaced = client.put(f"/api/v1/admin/documents/{document_id}/nodes", json={"revision": removed.json()["revision"], "nodes": without_instance})
        assert replaced.status_code == 200, replaced.text
        assert instance_id not in replaced.json()["nodes"]
        restored = client.put(f"/api/v1/admin/documents/{document_id}/nodes", json={"revision": replaced.json()["document"]["revision"], "nodes": list(before_structural_undo["nodes"].values())})
        assert restored.status_code == 200, restored.text
        assert restored.json()["nodes"][instance_id]["component_overrides"][component_heading_id]["props_override"] == {"text": "Editado"}
        detached = client.post(f"/api/v1/admin/component-instances/{instance_id}/detachments", headers={"If-Match": str(restored.json()["document"]["revision"])})
        assert detached.status_code == 201, detached.text
        assert detached.json()["root_ids"]
        detached_document = client.get(f"/api/v1/admin/documents/{document_id}").json()
        assert any(node["props"].get("text") == "Editado" for node in detached_document["nodes"].values())
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
