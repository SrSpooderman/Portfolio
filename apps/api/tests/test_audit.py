from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db import Base
from app.models import AuditEvent, Document, User
from app import audit  # noqa: F401 - installs session listener


def test_authenticated_write_creates_audit_event():
    engine = create_engine("sqlite+pysqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        user = User(email="audit@example.test", username="auditor", password_hash="hash")
        db.add(user)
        db.commit()
        db.info["actor_id"] = user.id
        document = Document(document_type="PAGE", name="Audit test")
        db.add(document)
        db.commit()
        events = db.scalars(select(AuditEvent).where(AuditEvent.entity_type == "editor_documents")).all()
        assert len(events) == 1
        assert events[0].user_id == user.id
        assert events[0].entity_id == document.id
    engine.dispose()
