"""Reusable components, detached templates and portable import/export packages."""

import base64
import copy
import hashlib
import io
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from PIL import Image, UnidentifiedImageError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import settings
from app.audit import record as audit_record
from app.db import get_db
from app.domain.component_graph import creates_cycle
from app.domain.tree import subtree_ids, validate_tree
from app.editor import deepest_first, document_nodes, document_or_404, node_or_404, revision_guard, serialize_document
from app.models import Asset, Component, ComponentClassOverride, ComponentInstance, ComponentOverride, DesignToken, Document, Node, NodeStyleClass, Page, StyleClass, StyleRule, Template
from app.security import current_user
from app.serialization import row

router = APIRouter(prefix="/api/v1/admin", tags=["composition"], dependencies=[Depends(current_user)])


def component_edges(db: Session) -> dict[str, set[str]]:
    edges: dict[str, set[str]] = {}
    for owner, target in db.execute(select(Node.document_id, ComponentInstance.component_document_id).join(ComponentInstance, ComponentInstance.node_id == Node.id)):
        edges.setdefault(owner, set()).add(target)
    return edges


def ensure_component_reference_is_acyclic(db: Session, owner_document_id: str, referenced_document_id: str) -> None:
    if creates_cycle(component_edges(db), owner_document_id, referenced_document_id):
        raise HTTPException(422, "Component reference would create a cycle")


def contains_value(value, candidates: set[str]) -> bool:
    if isinstance(value, str):
        return value in candidates
    if isinstance(value, dict):
        return any(contains_value(item, candidates) for item in value.values())
    if isinstance(value, list):
        return any(contains_value(item, candidates) for item in value)
    return False


def dependency_bundle(db: Session, trees: list[dict]) -> dict:
    """Collect only dependencies needed by the exported trees."""
    class_ids: set[str] = set()
    for tree in trees:
        for assignments in (tree.get("classes") or {}).values():
            class_ids.update(item[0] for item in assignments if isinstance(item, list) and item)
    classes = list(db.scalars(select(StyleClass).where(StyleClass.id.in_(class_ids) if class_ids else False)))
    rules_by_class: dict[str, list[dict]] = {}
    if class_ids:
        for rule in db.scalars(select(StyleRule).where(StyleRule.style_class_id.in_(class_ids))):
            rules_by_class.setdefault(rule.style_class_id, []).append(row(rule))
    class_payload = [{**row(item), "rules": rules_by_class.get(item.id, [])} for item in classes]

    searchable: list[object] = [trees, class_payload]
    tokens = list(db.scalars(select(DesignToken)))
    selected_tokens: list[DesignToken] = []
    pending = True
    while pending:
        pending = False
        for token in tokens:
            if token in selected_tokens:
                continue
            names = {token.key, "$" + token.key, "var(--" + token.key.replace(".", "-") + ")"}
            if any(contains_value(value, names) for value in searchable):
                selected_tokens.append(token)
                searchable.append(token.value)
                pending = True

    assets = []
    for asset in db.scalars(select(Asset)):
        if not any(contains_value(value, {asset.id}) for value in searchable):
            continue
        path = settings.asset_path / asset.storage_key
        if not path.is_file():
            raise HTTPException(409, f"Asset file is missing: {asset.id}")
        assets.append({**row(asset), "content_base64": base64.b64encode(path.read_bytes()).decode("ascii")})
    return {"classes": class_payload, "tokens": [row(item) for item in selected_tokens], "assets": assets}


def restore_dependencies(db: Session, dependencies: dict) -> tuple[dict[str, str], dict[str, str]]:
    """Restore portable dependencies and return old-to-local identifier maps."""
    if not isinstance(dependencies, dict):
        raise HTTPException(422, "Invalid dependencies")
    class_rows = dependencies.get("classes") or []
    token_rows = dependencies.get("tokens") or []
    asset_rows = dependencies.get("assets") or []
    if not all(isinstance(items, list) for items in (class_rows, token_rows, asset_rows)) or sum(map(len, (class_rows, token_rows, asset_rows))) > 5000:
        raise HTTPException(422, "Invalid dependencies")

    for source in token_rows:
        if not isinstance(source, dict) or not source.get("key"):
            raise HTTPException(422, "Invalid token dependency")
        existing = db.scalar(select(DesignToken).where(DesignToken.key == source["key"]))
        if existing is None:
            db.add(DesignToken(key=source["key"], category=source.get("category") or "imported", type=source.get("type") or "value", value=source.get("value"), description=source.get("description")))

    asset_map: dict[str, str] = {}
    allowed_mime = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "application/pdf": ".pdf", "video/mp4": ".mp4"}
    for source in asset_rows:
        try:
            old_id = source["id"]
            mime = source["mime_type"]
            raw = base64.b64decode(source["content_base64"], validate=True)
            digest = hashlib.sha256(raw).hexdigest()
        except (KeyError, TypeError, ValueError):
            raise HTTPException(422, "Invalid asset dependency") from None
        if mime not in allowed_mime or len(raw) > 20 * 1024 * 1024 or digest != source.get("sha256"):
            raise HTTPException(422, "Invalid asset dependency")
        width = source.get("width")
        height = source.get("height")
        if mime.startswith("image/"):
            try:
                with Image.open(io.BytesIO(raw)) as image:
                    image.verify()
                with Image.open(io.BytesIO(raw)) as image:
                    width, height = image.size
                    if width * height > 100_000_000:
                        raise HTTPException(422, "Image dimensions are too large")
            except (UnidentifiedImageError, OSError):
                raise HTTPException(422, "Invalid image dependency") from None
        elif mime == "application/pdf" and not raw.startswith(b"%PDF-"):
            raise HTTPException(422, "Invalid PDF dependency")
        elif mime == "video/mp4" and (len(raw) < 12 or raw[4:8] != b"ftyp"):
            raise HTTPException(422, "Invalid MP4 dependency")
        asset = db.scalar(select(Asset).where(Asset.sha256 == digest))
        if asset is None:
            key = f"{digest[:2]}/{digest}{allowed_mime[mime]}"
            destination = settings.asset_path / key
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(raw)
            asset = Asset(sha256=digest, original_filename=Path(source.get("original_filename") or "asset").name, storage_key=key, mime_type=mime, size_bytes=len(raw), width=width, height=height, alt_text=source.get("alt_text"))
            db.add(asset)
            db.flush()
        asset_map[old_id] = asset.id

    class_map: dict[str, str] = {}
    for source in class_rows:
        if not isinstance(source, dict) or not source.get("id") or not source.get("slug"):
            raise HTTPException(422, "Invalid style class dependency")
        style = db.scalar(select(StyleClass).where(StyleClass.slug == source["slug"]))
        created = style is None
        if style is None:
            style = StyleClass(name=source.get("name") or source["slug"], slug=source["slug"], description=source.get("description"))
            db.add(style)
            db.flush()
        class_map[source["id"]] = style.id
        if created:
            for rule in source.get("rules") or []:
                if rule.get("breakpoint") not in {"desktop", "tablet", "mobile"} or rule.get("state") not in {"default", "hover", "focus", "active", "disabled"}:
                    raise HTTPException(422, "Invalid style rule dependency")
                db.add(StyleRule(style_class_id=style.id, breakpoint=rule["breakpoint"], state=rule["state"], properties=rule.get("properties") or {}))
    return class_map, asset_map


def remap_tree_package(package: dict, class_map: dict[str, str], asset_map: dict[str, str]) -> dict:
    result = copy.deepcopy(package)
    for node_id, assignments in (result.get("classes") or {}).items():
        result["classes"][node_id] = [[class_map.get(item[0], item[0]), *item[1:]] for item in assignments]

    def remap(value):
        if isinstance(value, str):
            return asset_map.get(value, value)
        if isinstance(value, dict):
            return {key: remap(item) for key, item in value.items()}
        if isinstance(value, list):
            return [remap(item) for item in value]
        return value

    return remap(result)


def exported_tree(db: Session, root: Node) -> dict:
    selected = set(subtree_ids([row(item) for item in document_nodes(db, root.document_id)], root.id))
    nodes = [row(item) for item in document_nodes(db, root.document_id) if item.id in selected]
    for item in nodes:
        instance = db.get(ComponentInstance, item["id"])
        if instance:
            item["component_document_id"] = instance.component_document_id
    classes = {}
    for assignment in db.scalars(select(NodeStyleClass).where(NodeStyleClass.node_id.in_(selected))):
        classes.setdefault(assignment.node_id, []).append([assignment.style_class_id, assignment.position])
    return {"schema_version": 1, "root_id": root.id, "nodes": nodes, "classes": classes}


def import_tree(db: Session, target_document_id: str, package: dict, parent_id: str | None, position: Decimal | None = None, id_map_out: dict[str, str] | None = None) -> str:
    if package.get("schema_version") != 1 or not isinstance(package.get("nodes"), list) or len(package["nodes"]) > 2000:
        raise HTTPException(422, "Invalid subtree package")
    nodes = package["nodes"]
    root_id = package.get("root_id")
    if root_id not in {item.get("id") for item in nodes}:
        raise HTTPException(422, "Missing subtree root")
    normalized = [{"id": item.get("id"), "parent_id": item.get("parent_id") if item.get("id") != root_id else None, "node_type": item.get("node_type")} for item in nodes]
    errors = validate_tree(normalized)
    if errors:
        raise HTTPException(422, {"errors": errors})
    if parent_id is not None:
        parent = node_or_404(db, parent_id)
        if parent.document_id != target_document_id or parent.node_type not in {"SECTION", "CONTAINER", "GRID", "FLEX", "COLUMNS", "STACK"}:
            raise HTTPException(422, "Invalid target parent")
    id_map = {item["id"]: str(uuid4()) for item in nodes}
    if id_map_out is not None:
        id_map_out.update(id_map)
    for source in nodes:
        is_root = source["id"] == root_id
        db.add(Node(id=id_map[source["id"]], document_id=target_document_id, parent_id=parent_id if is_root else id_map[source["parent_id"]], node_type=source["node_type"], position=position if is_root and position is not None else source.get("position", 10), props=source.get("props") or {}, layout=source.get("layout") or {}, style_overrides=source.get("style_overrides") or {}, analytics_key=source.get("analytics_key")))
        if source["node_type"] == "COMPONENT_INSTANCE":
            component_id = source.get("component_document_id")
            if not component_id or db.get(Component, component_id) is None:
                raise HTTPException(422, "Unresolved component reference")
            ensure_component_reference_is_acyclic(db, target_document_id, component_id)
            db.add(ComponentInstance(node_id=id_map[source["id"]], component_document_id=component_id))
    for old_id, class_rows in (package.get("classes") or {}).items():
        if old_id in id_map:
            for class_id, order in class_rows:
                if db.get(StyleClass, class_id) is None:
                    raise HTTPException(422, "Unresolved style class")
                db.add(NodeStyleClass(node_id=id_map[old_id], style_class_id=class_id, position=order))
    return id_map[root_id]


class ComponentCreate(BaseModel):
    name: str = Field(min_length=1)
    key: str = Field(min_length=1)
    description: str | None = None
    source_node_id: str | None = None


@router.get("/components")
def list_components(db: Session = Depends(get_db)):
    return [{**row(item), "name": db.get(Document, item.document_id).name} for item in db.scalars(select(Component))]


@router.post("/components", status_code=201)
def create_component(body: ComponentCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Component).where(Component.key == body.key)):
        raise HTTPException(409, "Component key exists")
    doc = Document(document_type="COMPONENT", name=body.name)
    db.add(doc)
    db.flush()
    db.add(Component(document_id=doc.id, key=body.key, description=body.description))
    if body.source_node_id:
        source = node_or_404(db, body.source_node_id)
        import_tree(db, doc.id, exported_tree(db, source), None)
    db.commit()
    return serialize_document(db, doc.id)


@router.get("/components/{component_id}")
def get_component(component_id: str, db: Session = Depends(get_db)):
    if db.get(Component, component_id) is None:
        raise HTTPException(404)
    return serialize_document(db, component_id)


@router.patch("/components/{component_id}")
def patch_component(component_id: str, body: dict, if_match: int | None = Header(default=None), db: Session = Depends(get_db)):
    component = db.get(Component, component_id)
    if component is None:
        raise HTTPException(404)
    doc = db.get(Document, component_id)
    revision_guard(doc, if_match)
    for key in body:
        if key not in {"name", "key", "description"}:
            raise HTTPException(422, "Invalid property")
    if "name" in body:
        doc.name = body["name"]
    if "key" in body:
        component.key = body["key"]
    if "description" in body:
        component.description = body["description"]
    doc.revision += 1
    db.commit()
    return serialize_document(db, component_id)


@router.delete("/components/{component_id}")
def delete_component(component_id: str, db: Session = Depends(get_db)):
    component = db.get(Component, component_id)
    if component is None:
        raise HTTPException(404)
    if db.scalar(select(ComponentInstance).where(ComponentInstance.component_document_id == component_id)):
        raise HTTPException(409, "Component has live instances")
    nodes = document_nodes(db, component_id)
    db.execute(delete(NodeStyleClass).where(NodeStyleClass.node_id.in_([item.id for item in nodes]) if nodes else False))
    for item in deepest_first(nodes):
        db.delete(item)
    db.flush()
    db.delete(component)
    db.delete(db.get(Document, component_id))
    db.commit()
    return {"ok": True}


class InstanceCreate(BaseModel):
    component_document_id: str
    parent_id: str | None = None
    position: Decimal = Decimal(10)


@router.post("/documents/{document_id}/component-instances", status_code=201)
def instantiate_component(document_id: str, body: InstanceCreate, if_match: int | None = Header(default=None), db: Session = Depends(get_db)):
    doc = document_or_404(db, document_id)
    revision_guard(doc, if_match)
    if db.get(Component, body.component_document_id) is None:
        raise HTTPException(404, "Component not found")
    ensure_component_reference_is_acyclic(db, document_id, body.component_document_id)
    node = Node(document_id=document_id, parent_id=body.parent_id, node_type="COMPONENT_INSTANCE", position=body.position, props={}, layout={}, style_overrides={})
    db.add(node)
    db.flush()
    db.add(ComponentInstance(node_id=node.id, component_document_id=body.component_document_id))
    doc.revision += 1
    db.commit()
    return {"node": row(node), "revision": doc.revision}


@router.patch("/component-instances/{instance_id}/nodes/{component_node_id}")
def patch_instance_node(instance_id: str, component_node_id: str, body: dict, if_match: int | None = Header(default=None), db: Session = Depends(get_db)):
    instance = db.get(ComponentInstance, instance_id)
    target = db.get(Node, component_node_id)
    if instance is None or target is None or target.document_id != instance.component_document_id:
        raise HTTPException(404)
    doc = document_or_404(db, db.get(Node, instance_id).document_id)
    revision_guard(doc, if_match)
    if set(body) - {"props_override", "style_override"}:
        raise HTTPException(422, "Invalid override")
    if any(key in body and not isinstance(body[key], dict) for key in ("props_override", "style_override")):
        raise HTTPException(422, "Overrides must be JSON objects")
    override = db.get(ComponentOverride, (instance_id, component_node_id))
    if override is None:
        override = ComponentOverride(instance_node_id=instance_id, target_component_node_id=component_node_id)
        db.add(override)
    if "props_override" in body:
        override.props_override = body["props_override"]
    if "style_override" in body:
        override.style_override = body["style_override"]
    doc.revision += 1
    db.commit()
    return {"revision": doc.revision}


@router.put("/component-instances/{instance_id}/nodes/{component_node_id}/style-classes")
def put_instance_classes(instance_id: str, component_node_id: str, body: dict, if_match: int | None = Header(default=None), db: Session = Depends(get_db)):
    instance = db.get(ComponentInstance, instance_id)
    target = db.get(Node, component_node_id)
    if instance is None or target is None or target.document_id != instance.component_document_id:
        raise HTTPException(404)
    doc = document_or_404(db, db.get(Node, instance_id).document_id)
    revision_guard(doc, if_match)
    db.execute(delete(ComponentClassOverride).where(ComponentClassOverride.instance_node_id == instance_id, ComponentClassOverride.target_component_node_id == component_node_id))
    changes = body.get("changes", [])
    if not isinstance(changes, list) or len(changes) > 100:
        raise HTTPException(422, "Invalid class changes")
    seen: set[str] = set()
    for index, item in enumerate(changes):
        if not isinstance(item, dict):
            raise HTTPException(422, "Invalid class change")
        if item.get("action") not in {"ADD", "REMOVE"}:
            raise HTTPException(422, "Invalid class action")
        if db.get(StyleClass, item.get("style_class_id")) is None:
            raise HTTPException(422, "Unknown style class")
        if item["style_class_id"] in seen:
            raise HTTPException(422, "Duplicate style class change")
        seen.add(item["style_class_id"])
        db.add(ComponentClassOverride(instance_node_id=instance_id, target_component_node_id=component_node_id, style_class_id=item["style_class_id"], action=item["action"], position=item.get("position", index)))
    doc.revision += 1
    db.commit()
    return {"revision": doc.revision}


@router.post("/component-instances/{instance_id}/detachments", status_code=201)
def detach(instance_id: str, if_match: int | None = Header(default=None), db: Session = Depends(get_db)):
    instance = db.get(ComponentInstance, instance_id)
    if instance is None:
        raise HTTPException(404)
    wrapper = node_or_404(db, instance_id)
    doc = document_or_404(db, wrapper.document_id)
    revision_guard(doc, if_match)
    source_nodes = document_nodes(db, instance.component_document_id)
    root_ids = []
    id_map: dict[str, str] = {}
    for root in source_nodes:
        if root.parent_id is None:
            root_ids.append(import_tree(db, doc.id, exported_tree(db, root), wrapper.parent_id, wrapper.position, id_map))
    db.flush()
    for override in db.scalars(select(ComponentOverride).where(ComponentOverride.instance_node_id == instance_id)):
        cloned_id = id_map.get(override.target_component_node_id)
        cloned = db.get(Node, cloned_id) if cloned_id else None
        if cloned:
            if override.props_override:
                cloned.props = {**(cloned.props or {}), **override.props_override}
            if override.style_override:
                cloned.style_overrides = {**(cloned.style_overrides or {}), **override.style_override}
    for override in db.scalars(select(ComponentClassOverride).where(ComponentClassOverride.instance_node_id == instance_id)):
        cloned_id = id_map.get(override.target_component_node_id)
        if cloned_id:
            assignment = db.get(NodeStyleClass, (cloned_id, override.style_class_id))
            if override.action == "REMOVE" and assignment:
                db.delete(assignment)
            elif override.action == "ADD" and assignment is None:
                db.add(NodeStyleClass(node_id=cloned_id, style_class_id=override.style_class_id, position=override.position or 0))
    db.execute(delete(ComponentOverride).where(ComponentOverride.instance_node_id == instance_id))
    db.execute(delete(ComponentClassOverride).where(ComponentClassOverride.instance_node_id == instance_id))
    db.delete(instance)
    db.delete(wrapper)
    doc.revision += 1
    audit_record(db, "COMPONENT_DETACHED", entity_type="nodes", entity_id=instance_id, metadata={"component_document_id": instance.component_document_id})
    db.commit()
    return {"root_ids": root_ids, "revision": doc.revision}


class TreeImport(BaseModel):
    package: dict
    parent_id: str | None = None
    position: Decimal | None = None


@router.post("/documents/{document_id}/nodes/import", status_code=201)
def import_nodes(document_id: str, body: TreeImport, if_match: int | None = Header(default=None), db: Session = Depends(get_db)):
    doc = document_or_404(db, document_id)
    revision_guard(doc, if_match)
    root_id = import_tree(db, document_id, body.package, body.parent_id, body.position)
    doc.revision += 1
    db.commit()
    return {"root_id": root_id, "revision": doc.revision}


@router.get("/documents/{document_id}/export")
def export_document(document_id: str, db: Session = Depends(get_db)):
    doc = document_or_404(db, document_id)
    trees = [exported_tree(db, item) for item in document_nodes(db, document_id) if item.parent_id is None]
    resource = {"document": row(doc), "trees": trees}
    if doc.document_type == "PAGE":
        resource["page"] = row(db.get(Page, document_id))
    elif doc.document_type == "COMPONENT":
        resource["component"] = row(db.get(Component, document_id))
    return {"schema_version": 1, "resource_type": doc.document_type, "resource": resource, "dependencies": dependency_bundle(db, trees)}


@router.get("/components/{component_id}/export")
def export_component(component_id: str, db: Session = Depends(get_db)):
    if db.get(Component, component_id) is None:
        raise HTTPException(404)
    return export_document(component_id, db)


@router.get("/templates/{template_id}/export")
def export_template(template_id: str, db: Session = Depends(get_db)):
    item = db.get(Template, template_id)
    if item is None:
        raise HTTPException(404)
    dependency_sources = [item.snapshot]
    if item.preview_asset_id:
        dependency_sources.append({"preview_asset_id": item.preview_asset_id})
    return {"schema_version": 1, "resource_type": "TEMPLATE", "resource": row(item), "dependencies": dependency_bundle(db, dependency_sources)}


class TemplateInsert(BaseModel):
    template_id: str
    parent_id: str | None = None
    position: Decimal | None = None


@router.post("/documents/{document_id}/template-instances", status_code=201)
def insert_template(document_id: str, body: TemplateInsert, if_match: int | None = Header(default=None), db: Session = Depends(get_db)):
    doc = document_or_404(db, document_id)
    revision_guard(doc, if_match)
    template = db.get(Template, body.template_id)
    if template is None:
        raise HTTPException(404)
    root_id = import_tree(db, document_id, template.snapshot, body.parent_id, body.position)
    doc.revision += 1
    db.commit()
    return {"root_id": root_id, "revision": doc.revision}


@router.post("/imports", status_code=201)
def import_resource(body: dict, db: Session = Depends(get_db)):
    resource_type = body.get("resource_type")
    if body.get("schema_version") != 1 or resource_type not in {"TEMPLATE", "PAGE", "COMPONENT"}:
        raise HTTPException(422, "Unsupported import format")
    resource = body.get("resource") or {}
    if not isinstance(resource, dict):
        raise HTTPException(422, "Invalid import resource")
    class_map, asset_map = restore_dependencies(db, body.get("dependencies") or {})
    if resource_type == "TEMPLATE":
        if not resource.get("name") or resource.get("template_type") not in {"SECTION", "COMPONENT", "PAGE"} or not isinstance(resource.get("snapshot"), dict):
            raise HTTPException(422, "Invalid template resource")
        item = Template(name=resource["name"], description=resource.get("description"), category=resource.get("category"), template_type=resource["template_type"], snapshot=remap_tree_package(resource["snapshot"], class_map, asset_map), preview_asset_id=asset_map.get(resource.get("preview_asset_id"), resource.get("preview_asset_id")))
        db.add(item)
        db.commit()
        return row(item)

    document_data = resource.get("document") or {}
    trees = resource.get("trees")
    if not document_data.get("name") or not isinstance(trees, list) or len(trees) > 200:
        raise HTTPException(422, "Invalid document resource")
    doc = Document(document_type=resource_type, name=document_data["name"])
    db.add(doc)
    db.flush()
    if resource_type == "PAGE":
        page_data = resource.get("page") or {}
        if not page_data.get("title") or not page_data.get("slug") or db.scalar(select(Page).where(Page.slug == page_data["slug"])):
            raise HTTPException(409, "Page slug is missing or already exists")
        if page_data.get("is_home"):
            for existing_home in db.scalars(select(Page).where(Page.is_home.is_(True))):
                existing_home.is_home = False
        db.add(Page(document_id=doc.id, slug=page_data["slug"], title=page_data["title"], is_home=bool(page_data.get("is_home")), is_enabled=page_data.get("is_enabled", True), seo_title=page_data.get("seo_title"), seo_description=page_data.get("seo_description")))
    else:
        component_data = resource.get("component") or {}
        if not component_data.get("key") or db.scalar(select(Component).where(Component.key == component_data["key"])):
            raise HTTPException(409, "Component key is missing or already exists")
        db.add(Component(document_id=doc.id, key=component_data["key"], description=component_data.get("description")))
    db.flush()
    for tree in trees:
        import_tree(db, doc.id, remap_tree_package(tree, class_map, asset_map), None)
    db.commit()
    return serialize_document(db, doc.id)
