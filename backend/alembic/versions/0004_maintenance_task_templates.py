"""add maintenance task templates

Revision ID: 0004_maintenance_task_templates
Revises: 0003_user_preferred_distance_unit
Create Date: 2026-04-19
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0004_maintenance_task_templates'
down_revision = '0003_user_preferred_distance_unit'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'maintenance_task_templates',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('owner_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('task_name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_maintenance_task_templates_owner_user_id', 'maintenance_task_templates', ['owner_user_id'])


def downgrade() -> None:
    op.drop_index('ix_maintenance_task_templates_owner_user_id', table_name='maintenance_task_templates')
    op.drop_table('maintenance_task_templates')
