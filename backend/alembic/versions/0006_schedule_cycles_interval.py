"""add cycle-based service intervals

Revision ID: 0006_schedule_cycles_interval
Revises: 0005_user_upcoming_task_window
Create Date: 2026-04-19
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0006_schedule_cycles_interval'
down_revision = '0005_user_upcoming_task_window'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('maintenance_schedules', sa.Column('interval_cycles', sa.Float(), nullable=True))
    op.add_column('maintenance_schedules', sa.Column('due_soon_threshold_cycles', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('maintenance_schedules', 'due_soon_threshold_cycles')
    op.drop_column('maintenance_schedules', 'interval_cycles')
