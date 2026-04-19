"""add upcoming task window days to users

Revision ID: 0005_user_upcoming_task_window
Revises: 0004_maintenance_task_templates
Create Date: 2026-04-19
"""

from alembic import op
import sqlalchemy as sa


revision = '0005_user_upcoming_task_window'
down_revision = '0004_maintenance_task_templates'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('upcoming_task_window_days', sa.Integer(), nullable=False, server_default='14'))
    op.alter_column('users', 'upcoming_task_window_days', server_default=None)


def downgrade() -> None:
    op.drop_column('users', 'upcoming_task_window_days')
