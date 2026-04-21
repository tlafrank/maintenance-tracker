from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class User(TimestampMixin, Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(255))
    preferred_distance_unit: Mapped[str] = mapped_column(String(10), default='km')
    upcoming_task_window_days: Mapped[int] = mapped_column(Integer, default=14)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    assets: Mapped[list['Asset']] = relationship(back_populates='owner')
    maintenance_tasks: Mapped[list['MaintenanceTaskTemplate']] = relationship(back_populates='owner', cascade='all, delete-orphan')


class AssetType(TimestampMixin, Base):
    __tablename__ = 'asset_types'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)


class Asset(TimestampMixin, Base):
    __tablename__ = 'assets'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    name: Mapped[str] = mapped_column(String(255))
    asset_type: Mapped[str] = mapped_column(String(100))
    manufacturer: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    registration_or_serial: Mapped[str | None] = mapped_column(String(255), nullable=True)
    thumbnail_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    service_trigger: Mapped[str] = mapped_column('interval_basis', String(20), default='distance')
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    owner: Mapped['User'] = relationship(back_populates='assets')
    meters: Mapped[list['Meter']] = relationship(back_populates='asset', cascade='all, delete-orphan')
    schedules: Mapped[list['MaintenanceSchedule']] = relationship(back_populates='asset', cascade='all, delete-orphan')
    events: Mapped[list['MaintenanceEvent']] = relationship(back_populates='asset', cascade='all, delete-orphan')


class Meter(TimestampMixin, Base):
    __tablename__ = 'meters'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey('assets.id'), index=True)
    service_trigger: Mapped[str] = mapped_column('meter_type', String(50))
    unit: Mapped[str] = mapped_column(String(20))
    current_value: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    asset: Mapped['Asset'] = relationship(back_populates='meters')
    readings: Mapped[list['MeterReading']] = relationship(back_populates='meter', cascade='all, delete-orphan')


class MeterReading(Base):
    __tablename__ = 'meter_readings'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meter_id: Mapped[int] = mapped_column(ForeignKey('meters.id'), index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey('assets.id'), index=True)
    reading_value: Mapped[float] = mapped_column(Numeric(12, 2))
    reading_timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    source: Mapped[str] = mapped_column(String(20), default='manual')
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    meter: Mapped['Meter'] = relationship(back_populates='readings')


class MaintenanceSchedule(TimestampMixin, Base):
    __tablename__ = 'maintenance_schedules'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey('assets.id'), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    interval_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    interval_distance: Mapped[float | None] = mapped_column(Float, nullable=True)
    interval_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    interval_cycles: Mapped[float | None] = mapped_column(Float, nullable=True)
    due_soon_threshold_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    due_soon_threshold_distance: Mapped[float | None] = mapped_column(Float, nullable=True)
    due_soon_threshold_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    due_soon_threshold_cycles: Mapped[float | None] = mapped_column(Float, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    asset: Mapped['Asset'] = relationship(back_populates='schedules')
    events: Mapped[list['MaintenanceEvent']] = relationship(back_populates='schedule')


class MaintenanceEvent(Base):
    __tablename__ = 'maintenance_events'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey('assets.id'), index=True)
    schedule_id: Mapped[int | None] = mapped_column(ForeignKey('maintenance_schedules.id'), nullable=True, index=True)
    performed_by_user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    performed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    event_type: Mapped[str] = mapped_column(String(50), default='maintenance')
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    completion_meter_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    asset: Mapped['Asset'] = relationship(back_populates='events')
    schedule: Mapped['MaintenanceSchedule | None'] = relationship(back_populates='events')


class MaintenanceTaskTemplate(TimestampMixin, Base):
    __tablename__ = 'maintenance_task_templates'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    task_name: Mapped[str] = mapped_column(String(100))

    owner: Mapped['User'] = relationship(back_populates='maintenance_tasks')
