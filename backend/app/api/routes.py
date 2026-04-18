import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.models import Asset, AssetType, MaintenanceEvent, MaintenanceSchedule, Meter, MeterReading, User
from app.schemas.schemas import (
    AssetCreate,
    AssetOut,
    AssetTypeCreate,
    AssetTypeOut,
    AssetUpdate,
    DashboardItem,
    DashboardOut,
    MaintenanceEventCreate,
    MaintenanceEventOut,
    MaintenanceActivitySuggestion,
    MeterCreate,
    MeterOut,
    MeterReadingCreate,
    MeterReadingOut,
    ScheduleCreate,
    ScheduleIntervalUpdate,
    ScheduleOut,
    ScheduleUpdate,
    Token,
    UserCreate,
    UserOut,
)
from app.services.due_logic import evaluate_schedule_status, latest_meter_map

router = APIRouter()
auth_logger = logging.getLogger('app.auth')


@router.post('/auth/register', response_model=UserOut)
def register(payload: UserCreate, request: Request, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        auth_logger.warning(
            'register_failed_existing_email email=%s ip=%s',
            payload.email,
            request.client.host if request.client else 'unknown',
        )
        raise HTTPException(status_code=400, detail='Email already registered')
    user = User(email=payload.email, display_name=payload.display_name, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    auth_logger.info(
        'register_success user_id=%s email=%s ip=%s',
        user.id,
        user.email,
        request.client.host if request.client else 'unknown',
    )
    return user


@router.post('/auth/login', response_model=Token)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == form_data.username))
    if not user or not verify_password(form_data.password, user.password_hash):
        auth_logger.warning(
            'login_failed email=%s ip=%s user_agent=%s',
            form_data.username,
            request.client.host if request.client else 'unknown',
            request.headers.get('user-agent', 'unknown'),
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')
    auth_logger.info(
        'login_success user_id=%s email=%s ip=%s user_agent=%s',
        user.id,
        user.email,
        request.client.host if request.client else 'unknown',
        request.headers.get('user-agent', 'unknown'),
    )
    return Token(access_token=create_access_token(str(user.id)))


@router.get('/auth/me', response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user




@router.get('/asset-types', response_model=list[AssetTypeOut])
def list_asset_types(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(AssetType).order_by(AssetType.name)).all()


@router.post('/asset-types', response_model=AssetTypeOut)
def create_asset_type(payload: AssetTypeCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    normalized_name = payload.name.strip()
    if not normalized_name:
        raise HTTPException(status_code=400, detail='Asset type name is required')

    existing = db.scalar(select(AssetType).where(AssetType.name == normalized_name))
    if existing:
        raise HTTPException(status_code=400, detail='Asset type already exists')

    asset_type = AssetType(name=normalized_name)
    db.add(asset_type)
    db.commit()
    db.refresh(asset_type)
    return asset_type


@router.get('/assets', response_model=list[AssetOut])
def list_assets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Asset).where(Asset.owner_user_id == current_user.id, Asset.archived_at.is_(None))).all()


@router.post('/assets', response_model=AssetOut)
def create_asset(payload: AssetCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    asset_type = db.scalar(select(AssetType).where(AssetType.name == payload.asset_type))
    if not asset_type:
        raise HTTPException(status_code=400, detail='Select a valid asset type')

    asset = Asset(owner_user_id=current_user.id, **payload.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def _owned_asset(asset_id: int, user_id: int, db: Session) -> Asset:
    asset = db.get(Asset, asset_id)
    if not asset or asset.owner_user_id != user_id or asset.archived_at is not None:
        raise HTTPException(status_code=404, detail='Asset not found')
    return asset


@router.get('/assets/{asset_id}', response_model=AssetOut)
def get_asset(asset_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _owned_asset(asset_id, current_user.id, db)


@router.put('/assets/{asset_id}', response_model=AssetOut)
def update_asset(asset_id: int, payload: AssetUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    asset = _owned_asset(asset_id, current_user.id, db)
    asset_type = db.scalar(select(AssetType).where(AssetType.name == payload.asset_type))
    if not asset_type:
        raise HTTPException(status_code=400, detail='Select a valid asset type')
    for key, value in payload.model_dump().items():
        setattr(asset, key, value)
    db.commit()
    db.refresh(asset)
    return asset


@router.delete('/assets/{asset_id}')
def archive_asset(asset_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    asset = _owned_asset(asset_id, current_user.id, db)
    asset.archived_at = datetime.utcnow()
    db.commit()
    return {'ok': True}


@router.post('/assets/{asset_id}/meters', response_model=MeterOut)
def create_meter(asset_id: int, payload: MeterCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_asset(asset_id, current_user.id, db)
    existing_meter = db.scalar(
        select(Meter)
        .where(Meter.asset_id == asset_id, Meter.meter_type == payload.meter_type)
        .order_by(desc(Meter.id))
    )
    if existing_meter:
        existing_meter.unit = payload.unit
        existing_meter.current_value = payload.current_value
        db.commit()
        db.refresh(existing_meter)
        return existing_meter

    meter = Meter(asset_id=asset_id, **payload.model_dump())
    db.add(meter)
    db.commit()
    db.refresh(meter)
    return meter


@router.get('/assets/{asset_id}/meters', response_model=list[MeterOut])
def list_meters(asset_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_asset(asset_id, current_user.id, db)
    return db.scalars(select(Meter).where(Meter.asset_id == asset_id)).all()


@router.post('/assets/{asset_id}/readings', response_model=MeterReadingOut)
def create_reading(asset_id: int, payload: MeterReadingCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_asset(asset_id, current_user.id, db)
    meter = db.get(Meter, payload.meter_id)
    if not meter or meter.asset_id != asset_id:
        raise HTTPException(status_code=404, detail='Meter not found')
    reading = MeterReading(
        meter_id=payload.meter_id,
        asset_id=asset_id,
        reading_value=payload.reading_value,
        reading_timestamp=payload.reading_timestamp or datetime.utcnow(),
        notes=payload.notes,
    )
    meter.current_value = payload.reading_value
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


@router.get('/assets/{asset_id}/readings', response_model=list[MeterReadingOut])
def list_readings(asset_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_asset(asset_id, current_user.id, db)
    return db.scalars(select(MeterReading).where(MeterReading.asset_id == asset_id).order_by(desc(MeterReading.reading_timestamp))).all()


@router.get('/assets/{asset_id}/schedules', response_model=list[ScheduleOut])
def list_schedules(asset_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_asset(asset_id, current_user.id, db)
    return db.scalars(select(MaintenanceSchedule).where(MaintenanceSchedule.asset_id == asset_id)).all()


@router.post('/assets/{asset_id}/schedules', response_model=ScheduleOut)
def create_schedule(asset_id: int, payload: ScheduleCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_asset(asset_id, current_user.id, db)
    schedule = MaintenanceSchedule(asset_id=asset_id, **payload.model_dump())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.put('/schedules/{schedule_id}', response_model=ScheduleOut)
def update_schedule(schedule_id: int, payload: ScheduleUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    schedule = db.get(MaintenanceSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail='Schedule not found')
    _owned_asset(schedule.asset_id, current_user.id, db)
    for key, value in payload.model_dump().items():
        setattr(schedule, key, value)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.patch('/schedules/{schedule_id}/intervals', response_model=ScheduleOut)
def update_schedule_intervals(schedule_id: int, payload: ScheduleIntervalUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    schedule = db.get(MaintenanceSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail='Schedule not found')
    _owned_asset(schedule.asset_id, current_user.id, db)

    schedule.interval_days = payload.interval_days
    schedule.interval_distance = payload.interval_distance
    schedule.interval_hours = payload.interval_hours
    db.commit()
    db.refresh(schedule)
    return schedule


@router.delete('/schedules/{schedule_id}')
def delete_schedule(schedule_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    schedule = db.get(MaintenanceSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail='Schedule not found')
    _owned_asset(schedule.asset_id, current_user.id, db)
    schedule.active = False
    db.commit()
    return {'ok': True}


@router.get('/assets/{asset_id}/maintenance-events', response_model=list[MaintenanceEventOut])
def list_events(asset_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_asset(asset_id, current_user.id, db)
    return db.scalars(select(MaintenanceEvent).where(MaintenanceEvent.asset_id == asset_id).order_by(desc(MaintenanceEvent.performed_at))).all()


@router.post('/assets/{asset_id}/maintenance-events', response_model=MaintenanceEventOut)
def create_event(asset_id: int, payload: MaintenanceEventCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_asset(asset_id, current_user.id, db)
    if payload.schedule_id:
        schedule = db.get(MaintenanceSchedule, payload.schedule_id)
        if not schedule or schedule.asset_id != asset_id:
            raise HTTPException(status_code=404, detail='Schedule not found')
    event = MaintenanceEvent(
        asset_id=asset_id,
        schedule_id=payload.schedule_id,
        performed_by_user_id=current_user.id,
        performed_at=payload.performed_at or datetime.utcnow(),
        event_type=payload.event_type,
        notes=payload.notes,
        completion_meter_value=payload.completion_meter_value,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get('/maintenance-activities', response_model=list[MaintenanceActivitySuggestion])
def list_maintenance_activities(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    events = db.scalars(
        select(MaintenanceEvent)
        .where(MaintenanceEvent.performed_by_user_id == current_user.id)
        .order_by(desc(MaintenanceEvent.performed_at))
    ).all()

    suggestions: list[MaintenanceActivitySuggestion] = []
    seen: set[str] = set()
    for event in events:
        key = event.event_type.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        suggestions.append(
            MaintenanceActivitySuggestion(
                activity_name=event.event_type,
                last_performed_at=event.performed_at,
                last_notes=event.notes,
                last_completion_meter_value=event.completion_meter_value,
            )
        )
    return suggestions


@router.get('/dashboard', response_model=DashboardOut)
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    assets = db.scalars(select(Asset).where(Asset.owner_user_id == current_user.id, Asset.archived_at.is_(None))).all()
    due_soon: list[DashboardItem] = []
    overdue: list[DashboardItem] = []

    for asset in assets:
        meter_map = latest_meter_map(asset.meters)
        for schedule in asset.schedules:
            if not schedule.active:
                continue
            last_event = db.scalar(
                select(MaintenanceEvent)
                .where(MaintenanceEvent.schedule_id == schedule.id)
                .order_by(desc(MaintenanceEvent.performed_at))
            )
            status_value = evaluate_schedule_status(schedule, asset, meter_map, last_event, datetime.utcnow())
            item = DashboardItem(
                asset_id=asset.id,
                schedule_id=schedule.id,
                asset_name=asset.name,
                schedule_title=schedule.title,
                status=status_value,
            )
            if status_value == 'overdue':
                overdue.append(item)
            elif status_value == 'due_soon':
                due_soon.append(item)

    recent_events = db.scalars(
        select(MaintenanceEvent)
        .join(Asset, Asset.id == MaintenanceEvent.asset_id)
        .where(Asset.owner_user_id == current_user.id)
        .order_by(desc(MaintenanceEvent.performed_at))
        .limit(10)
    ).all()
    return DashboardOut(due_soon=due_soon, overdue=overdue, recent_events=recent_events)


@router.get('/alerts')
def alerts(data: DashboardOut = Depends(dashboard)):
    return {'due_soon': data.due_soon, 'overdue': data.overdue}
