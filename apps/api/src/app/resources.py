import hashlib
import io
import re
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

import redis
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.domain.tree import validate_tree
from app.models import Asset, AssetVariant, DesignToken, Node, Project, ProjectTechnology, Publication, StyleClass, StyleRule, Technology, Template, TrackedLink, User
from app.security import current_user
from app.serialization import row
from app.shared.infrastructure.redis_gateway import RedisGateway

router = APIRouter(prefix="/api/v1/admin", tags=["resources"], dependencies=[Depends(current_user)])

RESOURCES = {
    "styles/classes": (StyleClass, {"name", "slug", "description"}),
    "styles/tokens": (DesignToken, {"key", "category", "type", "value", "description"}),
    "projects": (Project, {"slug", "title", "summary", "description", "project_type", "status", "cover_asset_id", "featured", "position", "started_at", "completed_at"}),
    "tracked-links": (TrackedLink, {"slug", "name", "destination_url", "tracking_enabled", "is_enabled", "project_id"}),
    "templates": (Template, {"name", "description", "category", "template_type", "snapshot", "preview_asset_id"}),
    "technologies": (Technology, {"name", "slug", "icon_asset_id"}),
}
REQUIRED_FIELDS = {
    StyleClass: {"name", "slug"},
    DesignToken: {"key", "category", "type", "value"},
    Project: {"slug", "title", "summary"},
    TrackedLink: {"slug", "name", "destination_url"},
    Template: {"name", "template_type", "snapshot"},
    Technology: {"name", "slug"},
}
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


def resource(kind: str):
    value = RESOURCES.get(kind)
    if value is None:
        raise HTTPException(404)
    return value


def allowed_payload(body: dict, fields: set[str]) -> dict:
    unknown = set(body) - fields
    if unknown:
        raise HTTPException(422, {"unknown_fields": sorted(unknown)})
    return body


def commit_or_conflict(db: Session):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Resource conflicts with an existing value") from None


def validate_resource(model, payload: dict, db: Session, creating: bool = False):
    if creating:
        missing = REQUIRED_FIELDS.get(model, set()) - set(payload)
        if missing:
            raise HTTPException(422, {"missing_fields": sorted(missing)})
    slug = payload.get("slug")
    if slug is not None and (not isinstance(slug, str) or SLUG.fullmatch(slug) is None):
        raise HTTPException(422, "Slug must contain lowercase letters, numbers and hyphens")
    string_fields = {
        StyleClass: {"name", "slug", "description"}, DesignToken: {"key", "category", "type", "description"},
        Project: {"slug", "title", "summary", "description", "project_type", "status"},
        TrackedLink: {"slug", "name", "destination_url"}, Template: {"name", "description", "category", "template_type"},
        Technology: {"name", "slug"},
    }.get(model, set())
    if any(key in payload and payload[key] is not None and not isinstance(payload[key], str) for key in string_fields):
        raise HTTPException(422, "Text fields must contain strings")
    boolean_fields = {Project: {"featured"}, TrackedLink: {"tracking_enabled", "is_enabled"}}.get(model, set())
    if any(key in payload and not isinstance(payload[key], bool) for key in boolean_fields):
        raise HTTPException(422, "Boolean fields must contain booleans")
    if model is DesignToken and "key" in payload and re.fullmatch(r"[a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+)*", payload["key"]) is None:
        raise HTTPException(422, "Invalid token key")
    if model is TrackedLink and "destination_url" in payload:
        try:
            parsed = urlsplit(payload["destination_url"])
        except (TypeError, ValueError):
            raise HTTPException(422, "Tracked link needs an HTTP(S) URL") from None
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise HTTPException(422, "Tracked link needs an HTTP(S) URL")
    if model is Project:
        if payload.get("project_type", "OTHER") not in {"FRONTEND", "BACKEND", "FULLSTACK", "DEVOPS", "OTHER"}:
            raise HTTPException(422, "Invalid project type")
        if payload.get("status", "DRAFT") not in {"DRAFT", "PUBLISHED", "ARCHIVED"}:
            raise HTTPException(422, "Invalid project status")
        for field in ("started_at", "completed_at"):
            if field in payload and isinstance(payload[field], str):
                try:
                    payload[field] = date.fromisoformat(payload[field])
                except ValueError:
                    raise HTTPException(422, f"Invalid {field}") from None
        if payload.get("cover_asset_id") and db.get(Asset, payload["cover_asset_id"]) is None:
            raise HTTPException(422, "Unknown cover asset")
    if model is TrackedLink and payload.get("project_id") and db.get(Project, payload["project_id"]) is None:
        raise HTTPException(422, "Unknown project")
    if model is Template:
        if payload.get("template_type", "SECTION") not in {"SECTION", "COMPONENT", "PAGE"}:
            raise HTTPException(422, "Invalid template type")
        if "snapshot" in payload:
            snapshot = payload["snapshot"]
            if not isinstance(snapshot, dict) or snapshot.get("schema_version") != 1 or not isinstance(snapshot.get("nodes"), list) or len(snapshot["nodes"]) > 2000:
                raise HTTPException(422, "Invalid template snapshot")
            nodes = snapshot["nodes"]
            if snapshot.get("root_id") not in {node.get("id") for node in nodes if isinstance(node, dict)} or any(not isinstance(node, dict) for node in nodes):
                raise HTTPException(422, "Invalid template root")
            errors = validate_tree([{"id": node.get("id"), "parent_id": node.get("parent_id") if node.get("id") != snapshot.get("root_id") else None, "node_type": node.get("node_type")} for node in nodes])
            if errors:
                raise HTTPException(422, {"errors": errors})
        if payload.get("preview_asset_id") and db.get(Asset, payload["preview_asset_id"]) is None:
            raise HTTPException(422, "Unknown preview asset")
    if model is Technology and payload.get("icon_asset_id") and db.get(Asset, payload["icon_asset_id"]) is None:
        raise HTTPException(422, "Unknown icon asset")


def contains_reference(value, names: set[str]) -> bool:
    if isinstance(value, str):
        return value in names
    if isinstance(value, dict):
        return any(contains_reference(child, names) for child in value.values())
    if isinstance(value, list):
        return any(contains_reference(child, names) for child in value)
    return False


def invalidate_redirects(*slugs: str | None) -> None:
    try:
        keys = ["redirect:" + slug for slug in slugs if slug]
        if keys:
            RedisGateway(settings.redis_url).delete(*keys)
    except redis.RedisError:
        return


def register_crud(path: str, model, fields: set[str]):
    def list_items(db: Session = Depends(get_db)):
        items = [row(item) for item in db.scalars(select(model))]
        if model is Project:
            assignments: dict[str, list[tuple[int, str]]] = {}
            for relation in db.scalars(select(ProjectTechnology)):
                assignments.setdefault(relation.project_id, []).append((relation.position, relation.technology_id))
            for item in items:
                item["technology_ids"] = [technology_id for _, technology_id in sorted(assignments.get(item["id"], []))]
        return items

    def create_item(body: dict, db: Session = Depends(get_db)):
        payload = allowed_payload(body, fields)
        validate_resource(model, payload, db, creating=True)
        item = model(**payload)
        db.add(item)
        commit_or_conflict(db)
        if model is TrackedLink:
            invalidate_redirects(item.slug)
        return row(item)

    def get_item(item_id: str, db: Session = Depends(get_db)):
        item = db.get(model, item_id)
        if item is None:
            raise HTTPException(404)
        result = row(item)
        if model is Project:
            result["technology_ids"] = list(db.scalars(select(ProjectTechnology.technology_id).where(ProjectTechnology.project_id == item_id).order_by(ProjectTechnology.position)))
        return result

    def patch_item(item_id: str, body: dict, db: Session = Depends(get_db)):
        item = db.get(model, item_id)
        if item is None:
            raise HTTPException(404)
        previous_slug = item.slug if model is TrackedLink else None
        payload = allowed_payload(body, fields)
        validate_resource(model, payload, db)
        for key, value in payload.items():
            setattr(item, key, value)
        if hasattr(item, "revision"):
            item.revision += 1
        commit_or_conflict(db)
        if model is TrackedLink:
            invalidate_redirects(previous_slug, item.slug)
        return row(item)

    def delete_item(item_id: str, db: Session = Depends(get_db)):
        item = db.get(model, item_id)
        if item is None:
            raise HTTPException(404)
        if model is DesignToken:
            names = {item.key, "$" + item.key}
            if any(contains_reference(rule.properties, names) for rule in db.scalars(select(StyleRule))) or any(contains_reference({"styles": node.style_overrides, "layout": node.layout}, names) for node in db.scalars(select(Node))):
                raise HTTPException(409, "Token is referenced by styles")
        if model is Project:
            if any(contains_reference(node.props, {item_id}) for node in db.scalars(select(Node))) or any(contains_reference(template.snapshot, {item_id}) for template in db.scalars(select(Template))):
                raise HTTPException(409, "Project is referenced by editor content")
            if db.scalar(select(TrackedLink).where(TrackedLink.project_id == item_id)):
                raise HTTPException(409, "Project has tracked links")
        if model is TrackedLink:
            if any(contains_reference(node.props, {item_id}) for node in db.scalars(select(Node))) or any(contains_reference(template.snapshot, {item_id}) for template in db.scalars(select(Template))):
                raise HTTPException(409, "Tracked link is referenced by editor content")
            if any(item_id in (publication.snapshot.get("trackedLinks") or {}) for publication in db.scalars(select(Publication))):
                raise HTTPException(409, "Tracked link is used by a publication")
        db.delete(item)
        commit_or_conflict(db)
        if model is TrackedLink:
            invalidate_redirects(item.slug)
        return {"ok": True}

    router.add_api_route("/" + path, list_items, methods=["GET"], name=f"list-{path}")
    router.add_api_route("/" + path, create_item, methods=["POST"], status_code=201, name=f"create-{path}")
    router.add_api_route("/" + path + "/{item_id}", get_item, methods=["GET"], name=f"get-{path}")
    router.add_api_route("/" + path + "/{item_id}", patch_item, methods=["PATCH"], name=f"patch-{path}")
    router.add_api_route("/" + path + "/{item_id}", delete_item, methods=["DELETE"], name=f"delete-{path}")


for _path, (_model, _fields) in RESOURCES.items():
    register_crud(_path, _model, _fields)


@router.get("/styles/classes/{item_id}/rules")
def get_rules(item_id: str, db: Session = Depends(get_db)):
    return [row(item) for item in db.scalars(select(StyleRule).where(StyleRule.style_class_id == item_id))]


@router.put("/styles/classes/{item_id}/rules/{breakpoint}/{state}")
def put_rule(item_id: str, breakpoint: str, state: str, body: dict, db: Session = Depends(get_db)):
    if breakpoint not in {"desktop", "tablet", "mobile"} or state not in {"default", "hover", "focus"}:
        raise HTTPException(422, "Invalid breakpoint or state")
    if db.get(StyleClass, item_id) is None:
        raise HTTPException(404)
    rule = db.scalar(select(StyleRule).where(StyleRule.style_class_id == item_id, StyleRule.breakpoint == breakpoint, StyleRule.state == state))
    if rule is None:
        rule = StyleRule(style_class_id=item_id, breakpoint=breakpoint, state=state)
        db.add(rule)
    rule.properties = body
    db.commit()
    return row(rule)


@router.delete("/styles/classes/{item_id}/rules/{breakpoint}/{state}")
def delete_rule(item_id: str, breakpoint: str, state: str, db: Session = Depends(get_db)):
    db.execute(delete(StyleRule).where(StyleRule.style_class_id == item_id, StyleRule.breakpoint == breakpoint, StyleRule.state == state))
    db.commit()
    return {"ok": True}


@router.put("/projects/{item_id}/technologies")
def set_technologies(item_id: str, body: dict, db: Session = Depends(get_db)):
    if db.get(Project, item_id) is None:
        raise HTTPException(404)
    ids = body.get("technology_ids", [])
    db.execute(delete(ProjectTechnology).where(ProjectTechnology.project_id == item_id))
    for position, technology_id in enumerate(ids):
        if db.get(Technology, technology_id) is None:
            raise HTTPException(422, "Unknown technology")
        db.add(ProjectTechnology(project_id=item_id, technology_id=technology_id, position=position))
    db.commit()
    return {"technology_ids": ids}


@router.get("/assets")
def list_assets(db: Session = Depends(get_db)):
    return [row(item) for item in db.scalars(select(Asset).order_by(Asset.created_at.desc()))]


@router.post("/assets", status_code=201)
def upload_asset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    data = file.file.read(20 * 1024 * 1024 + 1)
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(413, "Asset exceeds 20 MB")
    digest = hashlib.sha256(data).hexdigest()
    existing = db.scalar(select(Asset).where(Asset.sha256 == digest))
    if existing:
        return row(existing)
    mime = file.content_type or "application/octet-stream"
    if mime not in {"image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "video/mp4"}:
        raise HTTPException(415, "Unsupported asset type")
    suffix = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "application/pdf": ".pdf", "video/mp4": ".mp4"}[mime]
    width = height = None
    if mime.startswith("image/"):
        try:
            with Image.open(io.BytesIO(data)) as image:
                width, height = image.size
                if width * height > 100_000_000:
                    raise HTTPException(422, "Image dimensions are too large")
                image.verify()
        except UnidentifiedImageError:
            raise HTTPException(422, "Invalid image") from None
    elif mime == "application/pdf" and not data.startswith(b"%PDF-"):
        raise HTTPException(422, "Invalid PDF")
    elif mime == "video/mp4" and (len(data) < 12 or data[4:8] != b"ftyp"):
        raise HTTPException(422, "Invalid MP4")
    key = f"{digest[:2]}/{digest}{suffix}"
    destination = settings.asset_path / key
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    asset = Asset(sha256=digest, original_filename=Path(file.filename or "asset").name, storage_key=key, mime_type=mime, size_bytes=len(data), width=width, height=height)
    db.add(asset)
    commit_or_conflict(db)
    return row(asset)


@router.get("/assets/{item_id}")
def get_asset(item_id: str, db: Session = Depends(get_db)):
    item = db.get(Asset, item_id)
    if item is None:
        raise HTTPException(404)
    return row(item)


@router.patch("/assets/{item_id}")
def patch_asset(item_id: str, body: dict, db: Session = Depends(get_db)):
    item = db.get(Asset, item_id)
    if item is None:
        raise HTTPException(404)
    item.alt_text = allowed_payload(body, {"alt_text"}).get("alt_text", item.alt_text)
    db.commit()
    return row(item)


@router.delete("/assets/{item_id}")
def delete_asset(item_id: str, db: Session = Depends(get_db)):
    item = db.get(Asset, item_id)
    if item is None:
        raise HTTPException(404)
    if any(contains_reference({"props": node.props, "layout": node.layout, "styles": node.style_overrides}, {item_id}) for node in db.scalars(select(Node))):
        raise HTTPException(409, "Asset is used by a draft node")
    if db.scalar(select(Project).where(Project.cover_asset_id == item_id)) or db.scalar(select(Technology).where(Technology.icon_asset_id == item_id)):
        raise HTTPException(409, "Asset is used by a project")
    if db.scalar(select(Template).where(Template.preview_asset_id == item_id)) or any(contains_reference(template.snapshot, {item_id}) for template in db.scalars(select(Template))):
        raise HTTPException(409, "Asset is used by a template")
    if any(contains_reference(rule.properties, {item_id}) for rule in db.scalars(select(StyleRule))) or any(contains_reference(token.value, {item_id}) for token in db.scalars(select(DesignToken))):
        raise HTTPException(409, "Asset is used by styles")
    if any(item_id in (publication.snapshot.get("assets") or {}) for publication in db.scalars(select(Publication))):
        raise HTTPException(409, "Asset is used by a publication")
    variants = list(db.scalars(select(AssetVariant).where(AssetVariant.asset_id == item_id)))
    for variant in variants:
        db.delete(variant)
    db.delete(item)
    commit_or_conflict(db)
    (settings.asset_path / item.storage_key).unlink(missing_ok=True)
    for variant in variants:
        (settings.asset_path / variant.storage_key).unlink(missing_ok=True)
    return {"ok": True}
