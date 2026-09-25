import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.audit import record as audit_record
from app.db import get_db, utcnow
from app.domain.tree import validate_tree
from app.editor import document_nodes
from app.models import Asset, Component, ComponentClassOverride, ComponentInstance, ComponentOverride, DesignToken, Document, Node, NodeStyleClass, Page, PortfolioState, Project, ProjectTechnology, Publication, StyleClass, StyleRule, Technology, TrackedLink, User
from app.security import current_user
from app.serialization import row
from app.shared.infrastructure.snapshot_storage import LocalSnapshotStorage

router = APIRouter(prefix="/api/v1/admin", tags=["publishing"], dependencies=[Depends(current_user)])


def token_references(value) -> set[str]:
    if isinstance(value, str):
        return {value[1:]} if value.startswith("$") else set()
    if isinstance(value, dict):
        return set().union(*(token_references(item) for item in value.values())) if value else set()
    if isinstance(value, list):
        return set().union(*(token_references(item) for item in value)) if value else set()
    return set()


def atomic_json(path: Path, payload: dict) -> None:
    LocalSnapshotStorage(path.parent).write(path.name, payload)


def reconcile_publications(db: Session) -> None:
    """Use the physical pointer as the source of truth after interrupted publishes."""
    storage = LocalSnapshotStorage(settings.publication_path)
    changed = False
    for publication in db.scalars(select(Publication).where(Publication.status == "PREPARING")):
        publication.status = "READY" if storage.exists(publication.filename) else "FAILED"
        changed = True
    if storage.exists("current.json"):
        try:
            pointer = storage.read("current.json")
        except (OSError, ValueError):
            pointer = None
        if pointer:
            active = db.scalar(select(Publication).where(Publication.version_number == pointer.get("version"), Publication.content_hash == pointer.get("hash")))
            if active and storage.exists(active.filename):
                state = db.get(PortfolioState, 1)
                if state is None:
                    state = PortfolioState(id=1)
                    db.add(state)
                if state.active_publication_id != active.id:
                    previous = db.get(Publication, state.active_publication_id) if state.active_publication_id else None
                    if previous:
                        previous.status = "RETIRED"
                    state.active_publication_id = active.id
                    changed = True
                if active.status != "ACTIVE":
                    active.status = "ACTIVE"
                    changed = True
    if changed:
        db.commit()


def compile_snapshot(db: Session) -> tuple[dict, list[dict], list[dict]]:
    errors: list[dict] = []
    warnings: list[dict] = []
    pages = {}
    nodes = {}
    all_assets = {asset.id: asset for asset in db.scalars(select(Asset))}
    all_projects = {project.id: project for project in db.scalars(select(Project).where(Project.status == "PUBLISHED"))}
    all_links = {link.id: link for link in db.scalars(select(TrackedLink))}
    all_technologies = {technology.id: technology for technology in db.scalars(select(Technology))}
    project_technologies: dict[str, list[tuple[int, str]]] = {}
    for relation in db.scalars(select(ProjectTechnology)):
        project_technologies.setdefault(relation.project_id, []).append((relation.position, relation.technology_id))
    for project in all_projects.values():
        if project.cover_asset_id and project.cover_asset_id not in all_assets:
            errors.append({"code": "BROKEN_ASSET_REFERENCE", "project_id": project.id})
        elif project.cover_asset_id and not (settings.asset_path / all_assets[project.cover_asset_id].storage_key).is_file():
            errors.append({"code": "MISSING_ASSET_FILE", "project_id": project.id, "asset_id": project.cover_asset_id})
    for link in all_links.values():
        try:
            parsed = urlsplit(link.destination_url)
            valid_link = parsed.scheme in {"http", "https"} and bool(parsed.netloc)
        except ValueError:
            valid_link = False
        if link.is_enabled and not valid_link:
            errors.append({"code": "INVALID_TRACKED_LINK", "tracked_link_id": link.id})
    all_classes = {style.id: style for style in db.scalars(select(StyleClass))}
    rules = {}
    for rule in db.scalars(select(StyleRule)):
        rules.setdefault(rule.style_class_id, {}).setdefault(rule.breakpoint, {})[rule.state] = rule.properties
    assignments: dict[str, list[tuple[int, str]]] = {}
    for item in db.scalars(select(NodeStyleClass)):
        assignments.setdefault(item.node_id, []).append((item.position, item.style_class_id))
    components = {component.document_id: component for component in db.scalars(select(Component))}
    instances = {instance.node_id: instance for instance in db.scalars(select(ComponentInstance))}
    used_asset_ids: set[str] = {project.cover_asset_id for project in all_projects.values() if project.cover_asset_id}
    used_technology_ids = {technology_id for project_id, values in project_technologies.items() if project_id in all_projects for _, technology_id in values}
    used_asset_ids.update(all_technologies[item].icon_asset_id for item in used_technology_ids if item in all_technologies and all_technologies[item].icon_asset_id)
    for technology_id in used_technology_ids:
        technology = all_technologies.get(technology_id)
        if technology is None:
            errors.append({"code": "INVALID_TECHNOLOGY_REFERENCE", "technology_id": technology_id})
        elif technology.icon_asset_id and technology.icon_asset_id not in all_assets:
            errors.append({"code": "BROKEN_ASSET_REFERENCE", "technology_id": technology_id, "asset_id": technology.icon_asset_id})
        elif technology.icon_asset_id and not (settings.asset_path / all_assets[technology.icon_asset_id].storage_key).is_file():
            errors.append({"code": "MISSING_ASSET_FILE", "technology_id": technology_id, "asset_id": technology.icon_asset_id})
    overrides = {(item.instance_node_id, item.target_component_node_id): item for item in db.scalars(select(ComponentOverride))}
    class_overrides: dict[tuple[str, str], list[ComponentClassOverride]] = {}
    validated_components: set[str] = set()
    for item in db.scalars(select(ComponentClassOverride)):
        class_overrides.setdefault((item.instance_node_id, item.target_component_node_id), []).append(item)

    def add_node(source: Node, output_id: str, parent_id: str | None, stack: set[str], owner_instance_id: str | None = None):
        data = row(source)
        if source.node_type == "COMPONENT_INSTANCE":
            instance = instances.get(source.id)
            if not instance or instance.component_document_id not in components:
                errors.append({"code": "INVALID_COMPONENT_REFERENCE", "node_id": source.id})
                return
            if instance.component_document_id in stack:
                errors.append({"code": "INVALID_COMPONENT_REFERENCE", "node_id": source.id})
                return
            nodes[output_id] = {"id": output_id, "parentId": parent_id, "type": "STACK", "position": float(source.position), "props": {}, "layout": data["layout"] or {}, "styles": data["style_overrides"] or {}, "classes": [], "analyticsKey": source.analytics_key}
            component_nodes = document_nodes(db, instance.component_document_id)
            if instance.component_document_id not in validated_components:
                errors.extend(validate_tree([row(item) for item in component_nodes]))
                validated_components.add(instance.component_document_id)
            component_map = {item.id: item for item in component_nodes}
            for item in component_nodes:
                component_id = f"{output_id}:{item.id}"
                component_parent = f"{output_id}:{item.parent_id}" if item.parent_id in component_map else output_id
                add_node(item, component_id, component_parent, stack | {instance.component_document_id}, source.id)
            return
        override = overrides.get((owner_instance_id, source.id)) if owner_instance_id else None
        props = {**(data["props"] or {}), **(override.props_override or {})} if override else (data["props"] or {})
        asset_id = props.get("asset_id")
        if asset_id and asset_id not in all_assets:
            errors.append({"code": "BROKEN_ASSET_REFERENCE", "node_id": source.id})
        elif asset_id:
            used_asset_ids.add(asset_id)
            if not (settings.asset_path / all_assets[asset_id].storage_key).is_file():
                errors.append({"code": "MISSING_ASSET_FILE", "node_id": source.id, "asset_id": asset_id})
        for extra_asset_key in ("poster_asset_id", "cover_asset_id"):
            extra_asset_id = props.get(extra_asset_key)
            if extra_asset_id and extra_asset_id not in all_assets:
                errors.append({"code": "BROKEN_ASSET_REFERENCE", "node_id": source.id, "asset_id": extra_asset_id})
            elif extra_asset_id:
                used_asset_ids.add(extra_asset_id)
                if not (settings.asset_path / all_assets[extra_asset_id].storage_key).is_file():
                    errors.append({"code": "MISSING_ASSET_FILE", "node_id": source.id, "asset_id": extra_asset_id})
        if source.node_type == "IMAGE" and not (props.get("alt") or (all_assets.get(asset_id) and all_assets[asset_id].alt_text)):
            warnings.append({"code": "IMAGE_WITHOUT_ALT", "node_id": source.id})
        if props.get("project_id") and props["project_id"] not in all_projects:
            errors.append({"code": "INVALID_PROJECT_REFERENCE", "node_id": source.id})
        for project_id in props.get("project_ids", []) if isinstance(props.get("project_ids"), list) else []:
            if project_id not in all_projects:
                errors.append({"code": "INVALID_PROJECT_REFERENCE", "node_id": source.id, "project_id": project_id})
        if props.get("tracked_link_id") and (props["tracked_link_id"] not in all_links or not all_links[props["tracked_link_id"]].is_enabled):
            errors.append({"code": "INVALID_TRACKED_LINK", "node_id": source.id})
        if source.node_type in {"BUTTON", "LINK"} and props.get("href"):
            href = props["href"]
            try:
                parsed = urlsplit(href) if isinstance(href, str) else None
            except ValueError:
                parsed = None
            valid_external = parsed is not None and parsed.scheme in {"http", "https", "mailto", "tel"} and bool(parsed.netloc or parsed.path)
            if not isinstance(href, str) or not ((href.startswith("/") and not href.startswith("//")) or href.startswith("#") or valid_external):
                errors.append({"code": "INVALID_LINK_URL", "node_id": source.id})
        if source.node_type == "GRID":
            try:
                valid_columns = 1 <= int(props.get("columns", 12)) <= 12
            except (TypeError, ValueError):
                valid_columns = False
            if not valid_columns:
                errors.append({"code": "INVALID_GRID_COLUMNS", "node_id": source.id})
        for breakpoint, span in (data["layout"].get("columnSpan") or {}).items() if isinstance(data["layout"].get("columnSpan"), dict) else []:
            if breakpoint not in {"desktop", "tablet", "mobile"} or not isinstance(span, (int, float)) or not 1 <= span <= 12:
                errors.append({"code": "INVALID_GRID_PLACEMENT", "node_id": source.id})
        class_ids = [class_id for _, class_id in sorted(assignments.get(source.id, []))]
        for change in class_overrides.get((owner_instance_id, source.id), []):
            if change.action == "REMOVE" and change.style_class_id in class_ids:
                class_ids.remove(change.style_class_id)
            elif change.action == "ADD" and change.style_class_id not in class_ids:
                class_ids.append(change.style_class_id)
        styles = data["style_overrides"] or {}
        if override and override.style_override:
            styles = {**styles, **override.style_override}
        nodes[output_id] = {"id": output_id, "parentId": parent_id, "type": source.node_type, "position": float(source.position), "props": props, "layout": data["layout"] or {}, "styles": styles, "classes": [all_classes[class_id].slug for class_id in class_ids if class_id in all_classes], "analyticsKey": source.analytics_key}

    for page in db.scalars(select(Page).where(Page.is_enabled.is_(True))):
        if not re.fullmatch(r"[a-z0-9]+(?:[-/][a-z0-9]+)*", page.slug):
            errors.append({"code": "INVALID_PAGE_SLUG", "page_id": page.document_id})
        doc_nodes = document_nodes(db, page.document_id)
        errors.extend(validate_tree([row(item) for item in doc_nodes]))
        if not page.seo_description:
            warnings.append({"code": "SEO_DESCRIPTION_EMPTY", "page_id": page.document_id})
        path = "/" if page.is_home else "/" + page.slug.strip("/")
        if path in pages:
            errors.append({"code": "DUPLICATE_PAGE_PATH", "page_id": page.document_id})
        pages[path] = {"id": page.document_id, "title": page.title, "seoTitle": page.seo_title, "seoDescription": page.seo_description, "rootNodes": [item.id for item in doc_nodes if item.parent_id is None]}
        for item in doc_nodes:
            add_node(item, item.id, item.parent_id, set())
    if "/" not in pages:
        errors.append({"code": "HOME_PAGE_MISSING"})
    styles = {style.slug: rules.get(style.id, {}) for style in all_classes.values()}
    tokens = {token.key: token.value for token in db.scalars(select(DesignToken))}
    token_edges = {key: token_references(value) for key, value in tokens.items()}
    for key, references in token_edges.items():
        for missing in references - set(tokens):
            errors.append({"code": "INVALID_TOKEN_REFERENCE", "design_token": key, "token": missing})
    def token_cycle(current: str, path: set[str]) -> bool:
        if current in path:
            return True
        return any(reference in tokens and token_cycle(reference, path | {current}) for reference in token_edges.get(current, set()))
    for key in tokens:
        if token_cycle(key, set()):
            errors.append({"code": "TOKEN_REFERENCE_CYCLE", "design_token": key})
    for style_id, breakpoints in rules.items():
        for token in token_references(breakpoints) - set(tokens):
            errors.append({"code": "INVALID_TOKEN_REFERENCE", "style_class_id": style_id, "token": token})
    for node_id, node in nodes.items():
        for token in token_references({"styles": node.get("styles"), "layout": node.get("layout")}) - set(tokens):
            errors.append({"code": "INVALID_TOKEN_REFERENCE", "node_id": node_id, "token": token})
    projects_payload = {}
    for item in all_projects.values():
        projects_payload[item.id] = {**row(item), "technology_ids": [technology_id for _, technology_id in sorted(project_technologies.get(item.id, [])) if technology_id in all_technologies]}
    snapshot = {"schemaVersion": 1, "theme": {"tokens": tokens}, "styles": styles, "pages": pages, "nodes": nodes, "projects": projects_payload, "technologies": {item_id: row(all_technologies[item_id]) for item_id in used_technology_ids if item_id in all_technologies}, "assets": {item.id: {"url": "/assets/" + item.storage_key, "alt": item.alt_text} for item in all_assets.values() if item.id in used_asset_ids}, "trackedLinks": {item.id: "/go/" + item.slug for item in all_links.values() if item.is_enabled}}
    return snapshot, errors, warnings


@router.post("/publication-validations")
def validate_publication(db: Session = Depends(get_db)):
    _, errors, warnings = compile_snapshot(db)
    return {"valid": not errors, "errors": errors, "warnings": warnings}


class PublicationCreate(BaseModel):
    activate: bool = True


def activate_publication(db: Session, publication: Publication) -> None:
    storage = LocalSnapshotStorage(settings.publication_path)
    if not storage.exists(publication.filename):
        raise HTTPException(409, "Snapshot file is missing")
    pointer = {"version": publication.version_number, "hash": publication.content_hash, "url": "/content/" + publication.filename}
    storage.write("current.json", pointer)
    state = db.get(PortfolioState, 1)
    if state is None:
        state = PortfolioState(id=1)
        db.add(state)
    if state.active_publication_id and state.active_publication_id != publication.id:
        previous = db.get(Publication, state.active_publication_id)
        if previous:
            previous.status = "RETIRED"
    state.active_publication_id = publication.id
    publication.status = "ACTIVE"
    publication.published_at = utcnow()
    audit_record(db, "PUBLICATION_ACTIVATED", entity_type="publications", entity_id=publication.id, metadata={"version": publication.version_number})
    db.commit()


@router.post("/publications", status_code=201)
def create_publication(body: PublicationCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    reconcile_publications(db)
    # The singleton row is seeded by migration and serializes version allocation.
    db.scalar(select(PortfolioState).where(PortfolioState.id == 1).with_for_update())
    snapshot, errors, warnings = compile_snapshot(db)
    if errors:
        raise HTTPException(422, {"errors": errors, "warnings": warnings})
    version = (db.scalar(select(func.max(Publication.version_number))) or 0) + 1
    snapshot["publication"] = {"version": version}
    canonical = json.dumps(snapshot, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    digest = hashlib.sha256(canonical).hexdigest()
    filename = f"v{version}-{digest[:12]}.json"
    publication = Publication(version_number=version, content_hash=digest, filename=filename, snapshot=snapshot, status="PREPARING", created_by=user.id)
    db.add(publication)
    db.flush()
    audit_record(db, "PUBLICATION_CREATED", user_id=user.id, entity_type="publications", entity_id=publication.id, metadata={"version": version})
    db.commit()
    try:
        LocalSnapshotStorage(settings.publication_path).write(filename, snapshot)
        publication.status = "READY"
        db.commit()
        if body.activate:
            activate_publication(db, publication)
    except Exception:
        db.rollback()
        publication.status = "FAILED"
        db.commit()
        raise
    return {"publication": row(publication), "warnings": warnings}


@router.get("/publications")
def list_publications(db: Session = Depends(get_db)):
    reconcile_publications(db)
    return [row(item) for item in db.scalars(select(Publication).order_by(Publication.version_number.desc()))]


@router.get("/publications/{publication_id}")
def get_publication(publication_id: str, db: Session = Depends(get_db)):
    item = db.get(Publication, publication_id)
    if item is None:
        raise HTTPException(404)
    return row(item)


class Activation(BaseModel):
    publication_id: str


@router.put("/portfolio-state/active-publication")
def activate(body: Activation, db: Session = Depends(get_db)):
    publication = db.get(Publication, body.publication_id)
    if publication is None or publication.status not in {"READY", "RETIRED", "ACTIVE"}:
        raise HTTPException(404, "Publication unavailable")
    activate_publication(db, publication)
    return row(publication)
