"""Keep analytics identifiers after draft resources are deleted.

Revision ID: 0002_analytics_history
Revises: 0001_initial
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_analytics_history"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name != "mysql":
        return
    foreign_keys = sa.inspect(bind).get_foreign_keys("analytics_events")
    for foreign_key in foreign_keys:
        if set(foreign_key["constrained_columns"]) & {"page_id", "project_id", "tracked_link_id"}:
            op.drop_constraint(foreign_key["name"], "analytics_events", type_="foreignkey")


def downgrade():
    # The initial migration for new installations already omits these links.
    pass
