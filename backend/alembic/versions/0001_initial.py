"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-04-16
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    op.create_table(
        'assets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('asset_type', sa.String(length=100), nullable=False),
        sa.Column('manufacturer', sa.String(length=100), nullable=True),
        sa.Column('model', sa.String(length=100), nullable=True),
        sa.Column('year', sa.Integer(), nullable=True),
        sa.Column('registration_or_serial', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('archived_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['owner_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_assets_owner_user_id'), 'assets', ['owner_user_id'], unique=False)

    op.create_table(
        'maintenance_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('interval_days', sa.Integer(), nullable=True),
        sa.Column('interval_distance', sa.Float(), nullable=True),
        sa.Column('interval_hours', sa.Float(), nullable=True),
        sa.Column('due_soon_threshold_days', sa.Integer(), nullable=True),
        sa.Column('due_soon_threshold_distance', sa.Float(), nullable=True),
        sa.Column('due_soon_threshold_hours', sa.Float(), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_maintenance_schedules_asset_id'), 'maintenance_schedules', ['asset_id'], unique=False)

    op.create_table(
        'meters',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=False),
        sa.Column('meter_type', sa.String(length=50), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=False),
        sa.Column('current_value', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_meters_asset_id'), 'meters', ['asset_id'], unique=False)

    op.create_table(
        'maintenance_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=False),
        sa.Column('schedule_id', sa.Integer(), nullable=True),
        sa.Column('performed_by_user_id', sa.Integer(), nullable=False),
        sa.Column('performed_at', sa.DateTime(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('completion_meter_value', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id']),
        sa.ForeignKeyConstraint(['performed_by_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['schedule_id'], ['maintenance_schedules.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_maintenance_events_asset_id'), 'maintenance_events', ['asset_id'], unique=False)
    op.create_index(op.f('ix_maintenance_events_performed_by_user_id'), 'maintenance_events', ['performed_by_user_id'], unique=False)
    op.create_index(op.f('ix_maintenance_events_schedule_id'), 'maintenance_events', ['schedule_id'], unique=False)

    op.create_table(
        'meter_readings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('meter_id', sa.Integer(), nullable=False),
        sa.Column('asset_id', sa.Integer(), nullable=False),
        sa.Column('reading_value', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('reading_timestamp', sa.DateTime(), nullable=False),
        sa.Column('source', sa.String(length=20), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id']),
        sa.ForeignKeyConstraint(['meter_id'], ['meters.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_meter_readings_asset_id'), 'meter_readings', ['asset_id'], unique=False)
    op.create_index(op.f('ix_meter_readings_meter_id'), 'meter_readings', ['meter_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_meter_readings_meter_id'), table_name='meter_readings')
    op.drop_index(op.f('ix_meter_readings_asset_id'), table_name='meter_readings')
    op.drop_table('meter_readings')
    op.drop_index(op.f('ix_maintenance_events_schedule_id'), table_name='maintenance_events')
    op.drop_index(op.f('ix_maintenance_events_performed_by_user_id'), table_name='maintenance_events')
    op.drop_index(op.f('ix_maintenance_events_asset_id'), table_name='maintenance_events')
    op.drop_table('maintenance_events')
    op.drop_index(op.f('ix_meters_asset_id'), table_name='meters')
    op.drop_table('meters')
    op.drop_index(op.f('ix_maintenance_schedules_asset_id'), table_name='maintenance_schedules')
    op.drop_table('maintenance_schedules')
    op.drop_index(op.f('ix_assets_owner_user_id'), table_name='assets')
    op.drop_table('assets')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
