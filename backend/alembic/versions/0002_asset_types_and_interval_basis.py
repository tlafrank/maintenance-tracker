"""add global asset types and interval basis

Revision ID: 0002_asset_types_and_interval_basis
Revises: 0001_initial
Create Date: 2026-04-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0002_asset_types_and_interval_basis'
down_revision: Union[str, None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'asset_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_asset_types_name'), 'asset_types', ['name'], unique=True)

    op.add_column('assets', sa.Column('interval_basis', sa.String(length=20), nullable=False, server_default='distance'))

    op.execute("INSERT INTO asset_types (name) SELECT DISTINCT asset_type FROM assets WHERE asset_type IS NOT NULL")
    op.execute("INSERT INTO asset_types (name) SELECT 'Vehicle' WHERE NOT EXISTS (SELECT 1 FROM asset_types WHERE name = 'Vehicle')")
    op.execute("INSERT INTO asset_types (name) SELECT 'Equipment' WHERE NOT EXISTS (SELECT 1 FROM asset_types WHERE name = 'Equipment')")
    op.execute("INSERT INTO asset_types (name) SELECT 'Generator' WHERE NOT EXISTS (SELECT 1 FROM asset_types WHERE name = 'Generator')")


def downgrade() -> None:
    op.drop_column('assets', 'interval_basis')
    op.drop_index(op.f('ix_asset_types_name'), table_name='asset_types')
    op.drop_table('asset_types')
