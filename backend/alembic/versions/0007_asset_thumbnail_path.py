"""add asset thumbnail path

Revision ID: 0007_asset_thumbnail_path
Revises: 0006_schedule_cycles_interval
Create Date: 2026-04-20
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0007_asset_thumbnail_path'
down_revision = '0006_schedule_cycles_interval'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('assets', sa.Column('thumbnail_path', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('assets', 'thumbnail_path')
