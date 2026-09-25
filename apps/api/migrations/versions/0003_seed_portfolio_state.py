"""Seed the singleton used for publication activation and locking.

Revision ID: 0003_seed_portfolio_state
Revises: 0002_analytics_history
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_seed_portfolio_state"
down_revision = "0002_analytics_history"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    exists = bind.execute(sa.text("SELECT 1 FROM portfolio_state WHERE id = 1")).scalar()
    if not exists:
        bind.execute(sa.text("INSERT INTO portfolio_state (id, active_publication_id, updated_at) VALUES (1, NULL, CURRENT_TIMESTAMP)"))


def downgrade():
    op.execute(sa.text("DELETE FROM portfolio_state WHERE id = 1 AND active_publication_id IS NULL"))
