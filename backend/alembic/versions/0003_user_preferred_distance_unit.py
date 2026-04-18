"""add preferred distance unit to users

Revision ID: 0003_user_preferred_distance_unit
Revises: 0002_asset_types_interval
Create Date: 2026-04-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0003_user_preferred_distance_unit'
down_revision: Union[str, None] = '0002_asset_types_interval'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('preferred_distance_unit', sa.String(length=10), nullable=False, server_default='km'),
    )
    op.alter_column('users', 'preferred_distance_unit', server_default=None)


def downgrade() -> None:
    op.drop_column('users', 'preferred_distance_unit')
