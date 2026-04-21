"""remove seeded default asset types

Revision ID: 0008_remove_default_asset_types
Revises: 0007_asset_thumbnail_path
Create Date: 2026-04-21
"""

from alembic import op


revision = '0008_remove_default_asset_types'
down_revision = '0007_asset_thumbnail_path'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DELETE FROM asset_types WHERE name IN ('Vehicle', 'Equipment', 'Generator')")


def downgrade() -> None:
    op.execute("INSERT INTO asset_types (name) SELECT 'Vehicle' WHERE NOT EXISTS (SELECT 1 FROM asset_types WHERE name = 'Vehicle')")
    op.execute("INSERT INTO asset_types (name) SELECT 'Equipment' WHERE NOT EXISTS (SELECT 1 FROM asset_types WHERE name = 'Equipment')")
    op.execute("INSERT INTO asset_types (name) SELECT 'Generator' WHERE NOT EXISTS (SELECT 1 FROM asset_types WHERE name = 'Generator')")
