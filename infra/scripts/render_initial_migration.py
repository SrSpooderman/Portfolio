"""Generate the checked-in initial Alembic migration from the current model once."""

from pathlib import Path

from alembic.autogenerate import produce_migrations, render_python_code
from alembic.migration import MigrationContext
from sqlalchemy import create_engine

from app.db import Base
from app import models  # noqa: F401


engine = create_engine("sqlite+pysqlite://")
with engine.connect() as connection:
    changes = produce_migrations(MigrationContext.configure(connection), Base.metadata)
    upgrade = render_python_code(changes.upgrade_ops)
    downgrade = render_python_code(changes.downgrade_ops)

output = Path(__file__).resolve().parents[2] / "apps/api/migrations/versions/0001_initial.py"
output.write_text(
    '"""Initial CMS schema.\n\nRevision ID: 0001_initial\nRevises:\n"""\n'
    "from alembic import op\nimport sqlalchemy as sa\n\n"
    'revision = "0001_initial"\ndown_revision = None\nbranch_labels = None\ndepends_on = None\n\n\n'
    f"def upgrade():\n{upgrade}\n\n\ndef downgrade():\n{downgrade}\n",
    encoding="utf-8",
)
print("Generated explicit initial migration")
