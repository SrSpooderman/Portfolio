from decimal import Decimal
import hashlib
import io

from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.db import Base, get_db
from app.main import app
from app.models import Asset, DesignToken, Document, Node, NodeStyleClass, Page, StyleClass, StyleRule, User
from app.security import current_user


def memory_engine():
    engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    return engine


def test_document_package_restores_styles_tokens_and_asset_files(tmp_path, monkeypatch):
    source_engine = memory_engine()
    destination_engine = memory_engine()
    source_assets = tmp_path / "source-assets"
    destination_assets = tmp_path / "destination-assets"
    buffer = io.BytesIO()
    Image.new("RGB", (1, 1), "red").save(buffer, format="PNG")
    raw_asset = buffer.getvalue()
    active_engine = [source_engine]
    with Session(source_engine) as db:
        user = User(email="export@example.test", username="exporter", password_hash="hash")
        document = Document(document_type="PAGE", name="Portable page")
        style = StyleClass(name="Hero", slug="hero")
        token = DesignToken(key="color.primary", category="color", type="color", value="#123456")
        asset = Asset(sha256=hashlib.sha256(raw_asset).hexdigest(), original_filename="image.png", storage_key="aa/image.png", mime_type="image/png", size_bytes=len(raw_asset), width=1, height=1)
        db.add_all([user, document, style, token, asset])
        db.flush()
        page = Page(document_id=document.id, slug="portable", title="Portable page")
        node = Node(document_id=document.id, node_type="IMAGE", position=Decimal(10), props={"asset_id": asset.id}, layout={}, style_overrides={})
        db.add_all([page, node])
        db.flush()
        db.add_all([StyleRule(style_class_id=style.id, breakpoint="desktop", state="default", properties={"color": "color.primary"}), NodeStyleClass(node_id=node.id, style_class_id=style.id, position=0)])
        db.commit()
        source_asset_id = asset.id
        (source_assets / asset.storage_key).parent.mkdir(parents=True)
        (source_assets / asset.storage_key).write_bytes(raw_asset)

    def session_override():
        with Session(active_engine[0]) as db:
            yield db

    def user_override():
        return User(id="00000000-0000-0000-0000-000000000001", email="admin@example.test", username="admin", password_hash="hash")

    app.dependency_overrides[get_db] = session_override
    app.dependency_overrides[current_user] = user_override
    client = TestClient(app)
    try:
        monkeypatch.setattr(settings, "asset_path", source_assets)
        with Session(source_engine) as db:
            document_id = db.scalar(select(Document.id).where(Document.name == "Portable page"))
        exported = client.get(f"/api/v1/admin/documents/{document_id}/export")
        assert exported.status_code == 200, exported.text
        package = exported.json()
        assert package["dependencies"]["classes"][0]["slug"] == "hero"
        assert package["dependencies"]["tokens"][0]["key"] == "color.primary"
        assert package["dependencies"]["assets"][0]["id"] == source_asset_id

        active_engine[0] = destination_engine
        monkeypatch.setattr(settings, "asset_path", destination_assets)
        imported = client.post("/api/v1/admin/imports", json=package)
        assert imported.status_code == 201, imported.text
        imported_node = next(iter(imported.json()["nodes"].values()))
        with Session(destination_engine) as db:
            restored_asset = db.scalar(select(Asset))
            restored_style = db.scalar(select(StyleClass))
            restored_token = db.scalar(select(DesignToken))
            assert restored_asset.id != source_asset_id
            assert imported_node["props"]["asset_id"] == restored_asset.id
            assert imported_node["classes"] == [restored_style.id]
            assert restored_token.key == "color.primary"
            assert (destination_assets / restored_asset.storage_key).read_bytes() == raw_asset
    finally:
        app.dependency_overrides.clear()
        source_engine.dispose()
        destination_engine.dispose()
