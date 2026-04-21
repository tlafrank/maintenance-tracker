"""add asset_type to maintenance task templates

Revision ID: 0009_task_template_asset_type
Revises: 0008_remove_default_asset_types
Create Date: 2026-04-21
"""

from alembic import op
import sqlalchemy as sa


revision = '0009_task_template_asset_type'
down_revision = '0008_remove_default_asset_types'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('maintenance_task_templates', sa.Column('asset_type', sa.String(length=100), nullable=True))
    op.create_index(op.f('ix_maintenance_task_templates_asset_type'), 'maintenance_task_templates', ['asset_type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_maintenance_task_templates_asset_type'), table_name='maintenance_task_templates')
    op.drop_column('maintenance_task_templates', 'asset_type')
