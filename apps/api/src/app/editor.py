from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, object_session

from app.db import get_db
from app.audit import record as audit_record
from app.domain.component_graph import creates_cycle
from app.domain.tree import NODE_TYPES, subtree_ids, validate_tree
from app.models import Component, ComponentClassOverride, ComponentInstance, ComponentOverride, Document, Node, NodeStyleClass, Page, StyleClass, User
from app.infrastructure.repositories import SQLAlchemyNodeRepository
from app.security import current_user
from app.serialization import row

router = APIRouter(prefix="/api/v1/admin", tags=["editor"], dependencies=[Depends(current_user)])


class PageCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    is_home: bool = False


class PagePatch(BaseModel):
    title: str | None = None
    slug: str | None = None
    is_home: bool | None = None
    is_enabled: bool | None = None
    seo_title: str | None = None
    seo_description: str | None = None


class NodeInput(BaseModel):
    node_type: str
    parent_id: str | None = None
    position: Decimal = Decimal(10)
    props: dict = Field(default_factory=dict)
    layout: dict = Field(default_factory=dict)
    style_overrides: dict = Field(default_factory=dict)
    analytics_key: str | None = None


class NodePatch(BaseModel):
    parent_id: str | None = None
    position: Decimal | None = None
    props: dict | None = None
    layout: dict | None = None
    style_overrides: dict | None = None
    analytics_key: str | None = None


class BulkPatch(BaseModel):
    revision: int
    changes: list[dict]


class ReplaceTree(BaseModel):
    revision: int
    nodes: list[dict]


def document_or_404(db: Session, document_id: str) -> Document:
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(404, "Document not found")
    return doc


def node_or_404(db: Session, node_id: str) -> Node:
    node = SQLAlchemyNodeRepository(db).get_model(node_id)
    if node is None:
        raise HTTPException(404, "Node not found")
    return node


def revision_guard(doc: Document, revision: int | None):
    session = object_session(doc)
    if session is not None:
        # Serializes writers on MySQL so two requests cannot both consume one revision.
        session.refresh(doc, with_for_update=True)
    if revision is None or doc.revision != revision:
        raise HTTPException(409, {"code": "REVISION_CONFLICT", "current_revision": doc.revision})


def document_nodes(db: Session, document_id: str) -> list[Node]:
    return SQLAlchemyNodeRepository(db).get_document_node_models(document_id)


def deepest_first(nodes: list[Node]) -> list[Node]:
    by_id = {node.id: node for node in nodes}
    def depth(node: Node) -> int:
        current, seen, result = node.parent_id, {node.id}, 0
        while current in by_id and current not in seen:
            result += 1
            seen.add(current)
            current = by_id[current].parent_id
        return result
    return sorted(nodes, key=depth, reverse=True)


def serialize_document(db: Session, document_id: str) -> dict:
    doc = document_or_404(db, document_id)
    nodes = document_nodes(db, document_id)
    payload = {node.id: row(node) for node in nodes}
    classes = db.scalars(select(NodeStyleClass).where(NodeStyleClass.node_id.in_(payload) if payload else False).order_by(NodeStyleClass.position)).all()
    for item in classes:
        payload[item.node_id].setdefault("classes", []).append(item.style_class_id)
    if payload:
        instance_ids = []
        for instance in db.scalars(select(ComponentInstance).where(ComponentInstance.node_id.in_(payload))):
            payload[instance.node_id]["component_document_id"] = instance.component_document_id
            payload[instance.node_id]["component_overrides"] = {}
            instance_ids.append(instance.node_id)
        if instance_ids:
            for override in db.scalars(select(ComponentOverride).where(ComponentOverride.instance_node_id.in_(instance_ids))):
                payload[override.instance_node_id]["component_overrides"].setdefault(override.target_component_node_id, {}).update({"props_override": override.props_override or {}, "style_override": override.style_override or {}})
            for override in db.scalars(select(ComponentClassOverride).where(ComponentClassOverride.instance_node_id.in_(instance_ids)).order_by(ComponentClassOverride.position)):
                payload[override.instance_node_id]["component_overrides"].setdefault(override.target_component_node_id, {}).setdefault("class_changes", []).append({"style_class_id": override.style_class_id, "action": override.action, "position": override.position})
    result = {"document": row(doc), "nodes": payload, "root_nodes": [node.id for node in nodes if node.parent_id is None]}
    if doc.document_type == "PAGE":
        result["page"] = row(db.get(Page, document_id))
    else:
        result["component"] = row(db.get(Component, document_id))
    return result


@router.get("/documents")
def list_documents(db: Session = Depends(get_db)):
    return [row(doc) for doc in db.scalars(select(Document).order_by(Document.created_at.desc()))]


@router.get("/documents/{document_id}")
def get_document(document_id: str, db: Session = Depends(get_db)):
    return serialize_document(db, document_id)


@router.post("/pages", status_code=201)
def create_page(body: PageCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Page).where(Page.slug == body.slug)):
        raise HTTPException(409, "Slug already exists")
    if body.is_home:
        for page in db.scalars(select(Page).where(Page.is_home.is_(True))):
            page.is_home = False
    doc = Document(document_type="PAGE", name=body.title)
    db.add(doc)
    db.flush()
    page = Page(document_id=doc.id, title=body.title, slug=body.slug, is_home=body.is_home)
    db.add(page)
    db.commit()
    return serialize_document(db, doc.id)


@router.get("/pages/{page_id}")
def get_page(page_id: str, db: Session = Depends(get_db)):
    return serialize_document(db, page_id)


@router.patch("/pages/{page_id}")
def patch_page(page_id: str, body: PagePatch, if_match: int | None = Header(default=None), db: Session = Depends(get_db)):
    doc = document_or_404(db, page_id)
    revision_guard(doc, if_match)
    page = db.get(Page, page_id)
    if page is None:
        raise HTTPException(404)
    values = body.model_dump(exclude_unset=True)
    if values.get("is_home"):
        for other in db.scalars(select(Page).where(Page.is_home.is_(True))):
            other.is_home = False
    for key, value in values.items():
        setattr(page, key, value)
    if "title" in values:
        doc.name = page.title
    doc.revision += 1
    db.commit()
    return serialize_document(db, page_id)


@router.delete("/pages/{page_id}")
def delete_page(page_id: str, if_match: int | None = Header(default=None), db: Session = Depends(get_db)):
    doc = document_or_404(db, page_id)
    revision_guard(doc, if_match)
    nodes = document_nodes(db, page_id)
    ids = [node.id for node in nodes]
    if ids:
        db.execute(delete(NodeStyleClass).where(NodeStyleClass.node_id.in_(ids)))
        db.execute(delete(ComponentOverride).where(ComponentOverride.instance_node_id.in_(ids) | ComponentOverride.target_component_node_id.in_(ids)))
        db.execute(delete(ComponentClassOverride).where(ComponentClassOverride.instance_node_id.in_(ids) | ComponentClassOverride.target_component_node_id.in_(ids)))
        db.execute(delete(ComponentInstance).where(ComponentInstance.node_id.in_(ids)))
    for node in deepest_first(nodes):
        db.delete(node)
    db.flush()
    db.delete(db.get(Page, page_id))
    db.delete(doc)
    audit_record(db, "PAGE_DELETED", entity_type="pages", entity_id=page_id)
    db.commit()
    return {"ok": True}


def validate_candidate(db: Session, doc_id: str, candidate: list[dict]) -> None:
    errors = validate_tree(candidate)
    if errors:
        raise HTTPException(422, {"errors": errors})


@router.post("/documents/{document_id}/nodes", status_code=201)
def create_node(document_id: str, body: NodeInput, if_match: int | None = Header(default=None), db: Session = Depends(get_db)):
    doc = document_or_404(db, document_id)
    revision_guard(doc, if_match)
    if body.node_type not in NODE_TYPES:
        raise HTTPException(422, "Unknown node type")
    node = Node(document_id=document_id, **body.model_dump())
    candidate = [row(item) for item in document_nodes(db, document_id)] + [dict(id=node.id or str(uuid4()), node_type=node.node_type, parent_id=node.parent_id)]
    validate_candidate(db, document_id, candidate)
    db.add(node)
    doc.revision += 1
    db.commit()
    return {"node": row(node), "revision": doc.revision}


@router.get("/nodes/{node_id}")
def get_node(node_id: str, db: Session = Depends(get_db)):
    return row(node_or_404(db, node_id))


@router.patch("/nodes/{node_id}")
def patch_node(node_id: str, body: NodePatch, if_match: int | None = Header(default=None), db: Session = Depends(get_db)):
    node = node_or_404(db, node_id)
    doc = document_or_404(db, node.document_id)
    revision_guard(doc, if_match)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(node, key, value)
    candidate = [row(item) for item in document_nodes(db, node.document_id)]
    validate_candidate(db, node.document_id, candidate)
    doc.revision += 1
    db.commit()
    return {"node": row(node), "revision": doc.revision}


@router.patch("/documents/{document_id}/nodes")
def patch_nodes(document_id: str, body: BulkPatch, db: Session = Depends(get_db)):
    doc = document_or_404(db, document_id)
    revision_guard(doc, body.revision)
    for change in body.changes:
        node = node_or_404(db, change["id"])
        if node.document_id != document_id:
            raise HTTPException(422, "Node belongs to another document")
        for key in ("parent_id", "position", "props", "layout", "style_overrides", "analytics_key"):
            if key in change:
                setattr(node, key, change[key])
    validate_candidate(db, document_id, [row(item) for item in document_nodes(db, document_id)])
    doc.revision += 1
    db.commit()
    return serialize_document(db, document_id)


@router.put("/documents/{document_id}/nodes")
def replace_nodes(document_id: str, body: ReplaceTree, db: Session = Depends(get_db)):
    """Replace an editor tree in one transaction, used by structural undo/redo."""
    doc = document_or_404(db, document_id)
    revision_guard(doc, body.revision)
    if len(body.nodes) > 2000:
        raise HTTPException(422, "Document exceeds 2000 nodes")
    normalized = []
    for source in body.nodes:
        if not isinstance(source, dict) or not isinstance(source.get("id"), str) or len(source["id"]) > 36:
            raise HTTPException(422, "Invalid node")
        if not all(isinstance(source.get(key, {}), dict) for key in ("props", "layout", "style_overrides")):
            raise HTTPException(422, "Invalid node payload")
        normalized.append({"id": source["id"], "node_type": source.get("node_type"), "parent_id": source.get("parent_id")})
    validate_candidate(db, document_id, normalized)
    edges: dict[str, set[str]] = {}
    for owner, referenced in db.execute(select(Node.document_id, ComponentInstance.component_document_id).join(ComponentInstance, ComponentInstance.node_id == Node.id).where(Node.document_id != document_id)):
        edges.setdefault(owner, set()).add(referenced)
    for source in body.nodes:
        referenced = source.get("component_document_id") if source.get("node_type") == "COMPONENT_INSTANCE" else None
        if referenced and creates_cycle(edges, document_id, referenced):
            raise HTTPException(422, "Component reference would create a cycle")
        if referenced:
            edges.setdefault(document_id, set()).add(referenced)
    target = {source["id"]: source for source in body.nodes}
    current_nodes = document_nodes(db, document_id)
    current = {item.id: item for item in current_nodes}
    removed = set(current) - set(target)

    if removed:
        db.execute(delete(NodeStyleClass).where(NodeStyleClass.node_id.in_(removed)))
        db.execute(delete(ComponentOverride).where((ComponentOverride.instance_node_id.in_(removed)) | (ComponentOverride.target_component_node_id.in_(removed))))
        db.execute(delete(ComponentClassOverride).where((ComponentClassOverride.instance_node_id.in_(removed)) | (ComponentClassOverride.target_component_node_id.in_(removed))))
        db.execute(delete(ComponentInstance).where(ComponentInstance.node_id.in_(removed)))

    # Existing nodes are moved before obsolete parents are removed.
    for node_id, source in target.items():
        node = current.get(node_id)
        if node is None:
            continue
        node.parent_id = source.get("parent_id")
        node.node_type = source["node_type"]
        node.position = source.get("position", 10)
        node.props = source.get("props") or {}
        node.layout = source.get("layout") or {}
        node.style_overrides = source.get("style_overrides") or {}
        node.analytics_key = source.get("analytics_key")
    db.flush()
    for node in deepest_first(current_nodes):
        if node.id in removed:
            db.delete(node)
    db.flush()

    # Add parents before children regardless of the client-side map order.
    pending = {node_id for node_id in target if node_id not in current}
    while pending:
        ready = [node_id for node_id in pending if target[node_id].get("parent_id") not in pending]
        if not ready:
            raise HTTPException(422, "Invalid node tree")
        for node_id in ready:
            source = target[node_id]
            db.add(Node(id=node_id, document_id=document_id, parent_id=source.get("parent_id"), node_type=source["node_type"], position=source.get("position", 10), props=source.get("props") or {}, layout=source.get("layout") or {}, style_overrides=source.get("style_overrides") or {}, analytics_key=source.get("analytics_key")))
            pending.remove(node_id)
        db.flush()

    for node_id, source in target.items():
        instance = db.get(ComponentInstance, node_id)
        component_id = source.get("component_document_id") if source["node_type"] == "COMPONENT_INSTANCE" else None
        if component_id:
            if component_id == document_id or db.get(Component, component_id) is None:
                raise HTTPException(422, "Invalid component reference")
            if instance is None:
                db.add(ComponentInstance(node_id=node_id, component_document_id=component_id))
            else:
                instance.component_document_id = component_id
        elif instance is not None:
            db.execute(delete(ComponentOverride).where(ComponentOverride.instance_node_id == node_id))
            db.execute(delete(ComponentClassOverride).where(ComponentClassOverride.instance_node_id == node_id))
            db.delete(instance)

        if component_id:
            db.execute(delete(ComponentOverride).where(ComponentOverride.instance_node_id == node_id))
            db.execute(delete(ComponentClassOverride).where(ComponentClassOverride.instance_node_id == node_id))
            component_node_ids = set(db.scalars(select(Node.id).where(Node.document_id == component_id)))
            for target_node_id, override_data in (source.get("component_overrides") or {}).items():
                if target_node_id not in component_node_ids or not isinstance(override_data, dict):
                    raise HTTPException(422, "Invalid component override")
                props_override = override_data.get("props_override") or {}
                style_override = override_data.get("style_override") or {}
                if props_override or style_override:
                    db.add(ComponentOverride(instance_node_id=node_id, target_component_node_id=target_node_id, props_override=props_override, style_override=style_override))
                for position, change in enumerate(override_data.get("class_changes") or []):
                    class_id = change.get("style_class_id")
                    if change.get("action") not in {"ADD", "REMOVE"} or db.get(StyleClass, class_id) is None:
                        raise HTTPException(422, "Invalid component class override")
                    db.add(ComponentClassOverride(instance_node_id=node_id, target_component_node_id=target_node_id, style_class_id=class_id, action=change["action"], position=change.get("position", position)))

        db.execute(delete(NodeStyleClass).where(NodeStyleClass.node_id == node_id))
        for position, class_id in enumerate(source.get("classes") or []):
            if db.get(StyleClass, class_id) is None:
                raise HTTPException(422, "Unknown style class")
            db.add(NodeStyleClass(node_id=node_id, style_class_id=class_id, position=position))
    doc.revision += 1
    db.commit()
    return serialize_document(db, document_id)


@router.delete("/nodes/{node_id}")
def delete_node(node_id: str, if_match: int | None = Header(default=None), db: Session = Depends(get_db)):
    node = node_or_404(db, node_id)
    doc = document_or_404(db, node.document_id)
    revision_guard(doc, if_match)
    nodes = document_nodes(db, doc.id)
    selected = set(subtree_ids([row(item) for item in nodes], node_id))
    db.execute(delete(NodeStyleClass).where(NodeStyleClass.node_id.in_(selected)))
    db.execute(delete(ComponentOverride).where(ComponentOverride.instance_node_id.in_(selected) | ComponentOverride.target_component_node_id.in_(selected)))
    db.execute(delete(ComponentClassOverride).where(ComponentClassOverride.instance_node_id.in_(selected) | ComponentClassOverride.target_component_node_id.in_(selected)))
    db.execute(delete(ComponentInstance).where(ComponentInstance.node_id.in_(selected)))
    for item in deepest_first(nodes):
        if item.id in selected:
            db.delete(item)
    doc.revision += 1
    db.commit()
    return {"revision": doc.revision}


@router.post("/nodes/{node_id}/duplicates", status_code=201)
def duplicate_node(node_id: str, if_match: int | None = Header(default=None), db: Session = Depends(get_db)):
    root = node_or_404(db, node_id)
    doc = document_or_404(db, root.document_id)
    revision_guard(doc, if_match)
    all_nodes = document_nodes(db, doc.id)
    selected = set(subtree_ids([row(item) for item in all_nodes], root.id))
    id_map = {old: str(uuid4()) for old in selected}
    for source in all_nodes:
        if source.id not in selected:
            continue
        clone = Node(id=id_map[source.id], document_id=doc.id, parent_id=id_map.get(source.parent_id, source.parent_id), node_type=source.node_type, position=source.position + (Decimal("0.001") if source.id == root.id else 0), props=source.props, layout=source.layout, style_overrides=source.style_overrides, analytics_key=source.analytics_key)
        db.add(clone)
        instance = db.get(ComponentInstance, source.id)
        if instance:
            db.add(ComponentInstance(node_id=id_map[source.id], component_document_id=instance.component_document_id))
    classes = db.scalars(select(NodeStyleClass).where(NodeStyleClass.node_id.in_(selected))).all()
    for assignment in classes:
        db.add(NodeStyleClass(node_id=id_map[assignment.node_id], style_class_id=assignment.style_class_id, position=assignment.position))
    for override in db.scalars(select(ComponentOverride).where(ComponentOverride.instance_node_id.in_(selected))):
        db.add(ComponentOverride(instance_node_id=id_map[override.instance_node_id], target_component_node_id=override.target_component_node_id, props_override=override.props_override, style_override=override.style_override))
    for override in db.scalars(select(ComponentClassOverride).where(ComponentClassOverride.instance_node_id.in_(selected))):
        db.add(ComponentClassOverride(instance_node_id=id_map[override.instance_node_id], target_component_node_id=override.target_component_node_id, style_class_id=override.style_class_id, action=override.action, position=override.position))
    doc.revision += 1
    db.commit()
    return {"root_id": id_map[root.id], "revision": doc.revision}


class ClassAssignments(BaseModel):
    classes: list[str]


@router.put("/nodes/{node_id}/style-classes")
def assign_classes(node_id: str, body: ClassAssignments, if_match: int | None = Header(default=None), db: Session = Depends(get_db)):
    node = node_or_404(db, node_id)
    doc = document_or_404(db, node.document_id)
    revision_guard(doc, if_match)
    db.execute(delete(NodeStyleClass).where(NodeStyleClass.node_id == node_id))
    for index, slug in enumerate(body.classes):
        style = db.scalar(select(StyleClass).where(StyleClass.slug == slug))
        if style is None:
            raise HTTPException(422, f"Unknown class: {slug}")
        db.add(NodeStyleClass(node_id=node_id, style_class_id=style.id, position=index))
    doc.revision += 1
    db.commit()
    return {"revision": doc.revision}
