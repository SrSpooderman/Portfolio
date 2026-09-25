from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import event, select
from sqlalchemy.orm import Session

from app.db import get_db, new_id
from app.models import AnalyticsEvent, AuditEvent, RefreshToken
from app.security import current_user
from app.serialization import row

router = APIRouter(prefix="/api/v1/admin", tags=["audit"], dependencies=[Depends(current_user)])


def record(db: Session, action: str, request: Request | None = None, *, user_id: str | None = None, entity_type: str | None = None, entity_id: str | None = None, metadata: dict | None = None) -> None:
    db.add(AuditEvent(user_id=user_id or db.info.get("actor_id"), action=action, entity_type=entity_type, entity_id=entity_id, ip_address=(request.client.host if request and request.client else db.info.get("ip_address")), metadata_json=metadata))


@event.listens_for(Session, "before_flush")
def capture_changes(session: Session, flush_context, instances):
    actor = session.info.get("actor_id")
    if not actor:
        return
    for action, objects in (("CREATE", list(session.new)), ("UPDATE", list(session.dirty)), ("DELETE", list(session.deleted))):
        for obj in objects:
            if isinstance(obj, (AuditEvent, AnalyticsEvent, RefreshToken)) or not hasattr(obj, "__tablename__"):
                continue
            if action == "UPDATE" and not session.is_modified(obj, include_collections=False):
                continue
            entity_id = getattr(obj, "id", None) or getattr(obj, "document_id", None) or getattr(obj, "node_id", None)
            if entity_id is None and action == "CREATE" and hasattr(obj, "id") and not isinstance(getattr(obj, "id"), int):
                entity_id = new_id()
                obj.id = entity_id
            session.add(AuditEvent(user_id=actor, action=action, entity_type=obj.__tablename__, entity_id=str(entity_id) if entity_id is not None else None, ip_address=session.info.get("ip_address")))


@router.get("/audit-events")
def list_audit_events(limit: int = 100, action: str | None = None, from_date: datetime | None = Query(default=None, alias="from"), to_date: datetime | None = Query(default=None, alias="to"), db: Session = Depends(get_db)):
    safe_limit = min(max(limit, 1), 500)
    clauses = []
    if action:
        clauses.append(AuditEvent.action == action)
    if from_date:
        clauses.append(AuditEvent.created_at >= from_date)
    if to_date:
        clauses.append(AuditEvent.created_at <= to_date)
    return [row(item) for item in db.scalars(select(AuditEvent).where(*clauses).order_by(AuditEvent.id.desc()).limit(safe_limit))]
