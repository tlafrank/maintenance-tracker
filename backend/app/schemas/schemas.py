from datetime import datetime

from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = 'bearer'


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    display_name: str
    preferred_distance_unit: str = 'km'
    upcoming_task_window_days: int = 14
    is_active: bool

    class Config:
        from_attributes = True


class AssetTypeCreate(BaseModel):
    name: str


class AssetTypeOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class AssetBase(BaseModel):
    name: str
    asset_type: str
    manufacturer: str | None = None
    model: str | None = None
    year: int | None = None
    registration_or_serial: str | None = None
    notes: str | None = None
    interval_basis: str = 'distance'


class AssetCreate(AssetBase):
    pass


class AssetUpdate(AssetBase):
    pass


class AssetOut(AssetBase):
    id: int
    owner_user_id: int

    class Config:
        from_attributes = True


class MeterCreate(BaseModel):
    meter_type: str
    unit: str
    current_value: float | None = None


class MeterOut(BaseModel):
    id: int
    asset_id: int
    meter_type: str
    unit: str
    current_value: float | None

    class Config:
        from_attributes = True


class MeterReadingCreate(BaseModel):
    meter_id: int | None = None
    reading_value: float
    reading_timestamp: datetime | None = None
    notes: str | None = None


class MeterReadingOut(BaseModel):
    id: int
    meter_id: int
    asset_id: int
    reading_value: float
    reading_timestamp: datetime
    notes: str | None

    class Config:
        from_attributes = True


class ScheduleCreate(BaseModel):
    title: str
    description: str | None = None
    interval_days: int | None = None
    interval_distance: float | None = None
    interval_hours: float | None = None
    due_soon_threshold_days: int | None = None
    due_soon_threshold_distance: float | None = None
    due_soon_threshold_hours: float | None = None
    active: bool = True


class ScheduleUpdate(ScheduleCreate):
    pass


class ScheduleIntervalUpdate(BaseModel):
    interval_days: int | None = None
    interval_distance: float | None = None
    interval_hours: float | None = None


class ScheduleOut(ScheduleCreate):
    id: int
    asset_id: int

    class Config:
        from_attributes = True


class MaintenanceEventCreate(BaseModel):
    schedule_id: int | None = None
    performed_at: datetime | None = None
    event_type: str = 'maintenance'
    notes: str | None = None
    completion_meter_value: float | None = None


class MaintenanceEventOut(BaseModel):
    id: int
    asset_id: int
    schedule_id: int | None
    performed_by_user_id: int
    performed_at: datetime
    event_type: str
    notes: str | None
    completion_meter_value: float | None

    class Config:
        from_attributes = True


class MaintenanceActivitySuggestion(BaseModel):
    activity_name: str
    last_performed_at: datetime
    last_notes: str | None = None
    last_completion_meter_value: float | None = None


class MaintenanceTaskSuggestion(BaseModel):
    id: int | None = None
    task_name: str


class MaintenanceTaskRename(BaseModel):
    old_name: str
    new_name: str


class MaintenanceTaskCreate(BaseModel):
    task_name: str


class MaintenanceTaskUpdate(BaseModel):
    task_name: str


class DashboardItem(BaseModel):
    asset_id: int
    schedule_id: int
    asset_name: str
    schedule_title: str
    status: str


class DashboardOut(BaseModel):
    class RecentEventItem(BaseModel):
        id: int
        asset_id: int
        asset_name: str
        performed_at: datetime
        event_type: str
        notes: str | None
        completion_meter_value: float | None

    due_soon: list[DashboardItem]
    overdue: list[DashboardItem]
    recent_events: list[RecentEventItem]


class UserProfileUpdate(BaseModel):
    display_name: str
    preferred_distance_unit: str = 'km'
    upcoming_task_window_days: int = 14
    current_password: str | None = None
    new_password: str | None = None
