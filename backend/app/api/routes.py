import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.models import Asset, AssetType, MaintenanceEvent, MaintenanceSchedule, MaintenanceTaskTemplate, Meter, MeterReading, User
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
    MaintenanceTaskSuggestion,
    MaintenanceTaskRename,
    MaintenanceTaskCreate,
    MaintenanceTaskUpdate,
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
    UserProfileUpdate,
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
    user = User(
        email=payload.email,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
        preferred_distance_unit='km',
        upcoming_task_window_days=14,
    )
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


@router.put('/auth/profile', response_model=UserOut)
def update_profile(payload: UserProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.display_name = payload.display_name.strip() or current_user.display_name
    current_user.preferred_distance_unit = payload.preferred_distance_unit.strip() or 'km'
    current_user.upcoming_task_window_days = max(1, int(payload.upcoming_task_window_days or 14))

    if payload.new_password:
        if not payload.current_password or not verify_password(payload.current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail='Current password is incorrect')
        current_user.password_hash = hash_password(payload.new_password)

    db.commit()
    db.refresh(current_user)
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


def _validate_service_interval(interval_days: int | None, interval_distance: float | None, interval_hours: float | None):
    if interval_days is None and interval_distance is None and interval_hours is None:
        raise HTTPException(status_code=400, detail='Service interval requires time, service trigger usage, or both.')


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
    asset = _owned_asset(asset_id, current_user.id, db)
    existing_meter = db.scalar(
        select(Meter)
        .where(Meter.asset_id == asset_id)
        .order_by(desc(Meter.id))
    )
    if existing_meter:
        existing_meter.meter_type = asset.interval_basis
        existing_meter.unit = payload.unit
        existing_meter.current_value = payload.current_value
        db.commit()
        db.refresh(existing_meter)
        return existing_meter

    meter = Meter(
        asset_id=asset_id,
        meter_type=asset.interval_basis,
        unit=payload.unit,
        current_value=payload.current_value,
    )
    db.add(meter)
    db.commit()
    db.refresh(meter)
    return meter


@router.get('/assets/{asset_id}/meters', response_model=list[MeterOut])
def list_meters(asset_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _owned_asset(asset_id, current_user.id, db)
    meter = db.scalar(select(Meter).where(Meter.asset_id == asset_id).order_by(desc(Meter.id)))
    return [meter] if meter else []


@router.post('/assets/{asset_id}/readings', response_model=MeterReadingOut)
def create_reading(asset_id: int, payload: MeterReadingCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    asset = _owned_asset(asset_id, current_user.id, db)
    meter = db.get(Meter, payload.meter_id) if payload.meter_id else db.scalar(
        select(Meter).where(Meter.asset_id == asset_id).order_by(desc(Meter.id))
    )
    if not meter:
        meter = Meter(
            asset_id=asset_id,
            meter_type=asset.interval_basis,
            unit='km' if asset.interval_basis == 'distance' else asset.interval_basis,
            current_value=payload.reading_value,
        )
        db.add(meter)
        db.flush()
    elif meter.asset_id != asset_id:
        raise HTTPException(status_code=404, detail='Meter not found')
    reading = MeterReading(
        meter_id=meter.id,
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
    _validate_service_interval(payload.interval_days, payload.interval_distance, payload.interval_hours)
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
    _validate_service_interval(payload.interval_days, payload.interval_distance, payload.interval_hours)
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
    _validate_service_interval(payload.interval_days, payload.interval_distance, payload.interval_hours)

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
    asset = _owned_asset(asset_id, current_user.id, db)
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
    if payload.completion_meter_value is not None:
        meter = db.scalar(select(Meter).where(Meter.asset_id == asset_id).order_by(desc(Meter.id)))
        if not meter:
            meter = Meter(
                asset_id=asset_id,
                meter_type=asset.interval_basis,
                unit=current_user.preferred_distance_unit if asset.interval_basis == 'distance' else asset.interval_basis,
                current_value=payload.completion_meter_value,
            )
            db.add(meter)
            db.flush()
        reading = MeterReading(
            meter_id=meter.id,
            asset_id=asset_id,
            reading_value=payload.completion_meter_value,
            notes='Auto-captured from maintenance activity',
        )
        meter.current_value = payload.completion_meter_value
        db.add(reading)
    db.commit()
    db.refresh(event)
    return event


@router.put('/maintenance-events/{event_id}', response_model=MaintenanceEventOut)
def update_event(event_id: int, payload: MaintenanceEventCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.get(MaintenanceEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail='Maintenance event not found')
    asset = _owned_asset(event.asset_id, current_user.id, db)
    event.event_type = payload.event_type
    event.notes = payload.notes
    event.completion_meter_value = payload.completion_meter_value
    if payload.performed_at:
        event.performed_at = payload.performed_at

    if payload.completion_meter_value is not None:
        meter = db.scalar(select(Meter).where(Meter.asset_id == asset.id).order_by(desc(Meter.id)))
        if not meter:
            meter = Meter(
                asset_id=asset.id,
                meter_type=asset.interval_basis,
                unit=current_user.preferred_distance_unit if asset.interval_basis == 'distance' else asset.interval_basis,
                current_value=payload.completion_meter_value,
            )
            db.add(meter)
            db.flush()
        else:
            meter.current_value = payload.completion_meter_value
        db.add(MeterReading(
            meter_id=meter.id,
            asset_id=asset.id,
            reading_value=payload.completion_meter_value,
            notes='Auto-captured from maintenance history update',
        ))
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


@router.get('/maintenance-tasks', response_model=list[MaintenanceTaskSuggestion])
def list_maintenance_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    templates = db.scalars(
        select(MaintenanceTaskTemplate)
        .where(MaintenanceTaskTemplate.owner_user_id == current_user.id)
        .order_by(MaintenanceTaskTemplate.task_name)
    ).all()
    tasks: list[MaintenanceTaskSuggestion] = [
        MaintenanceTaskSuggestion(id=template.id, task_name=template.task_name)
        for template in templates
    ]
    seen: set[str] = {template.task_name.strip().lower() for template in templates}

    events = db.scalars(
        select(MaintenanceEvent)
        .where(MaintenanceEvent.performed_by_user_id == current_user.id)
        .order_by(desc(MaintenanceEvent.performed_at))
    ).all()
    for event in events:
        for task in [part.strip() for part in event.event_type.split(',')]:
            key = task.lower()
            if not task or key in seen:
                continue
            seen.add(key)
            tasks.append(MaintenanceTaskSuggestion(id=None, task_name=task))
    return tasks


@router.post('/maintenance-tasks', response_model=MaintenanceTaskSuggestion)
def create_maintenance_task(payload: MaintenanceTaskCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task_name = payload.task_name.strip()
    if not task_name:
        raise HTTPException(status_code=400, detail='Task name is required')
    existing = db.scalar(
        select(MaintenanceTaskTemplate).where(
            MaintenanceTaskTemplate.owner_user_id == current_user.id,
            MaintenanceTaskTemplate.task_name == task_name,
        )
    )
    if existing:
        raise HTTPException(status_code=400, detail='Task already exists')
    template = MaintenanceTaskTemplate(owner_user_id=current_user.id, task_name=task_name)
    db.add(template)
    db.commit()
    db.refresh(template)
    return MaintenanceTaskSuggestion(id=template.id, task_name=template.task_name)


@router.put('/maintenance-tasks/{task_id}', response_model=MaintenanceTaskSuggestion)
def update_maintenance_task(task_id: int, payload: MaintenanceTaskUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    template = db.get(MaintenanceTaskTemplate, task_id)
    if not template or template.owner_user_id != current_user.id:
        raise HTTPException(status_code=404, detail='Maintenance task not found')
    task_name = payload.task_name.strip()
    if not task_name:
        raise HTTPException(status_code=400, detail='Task name is required')
    template.task_name = task_name
    db.commit()
    db.refresh(template)
    return MaintenanceTaskSuggestion(id=template.id, task_name=template.task_name)


@router.put('/maintenance-tasks/rename')
def rename_maintenance_task(payload: MaintenanceTaskRename, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    old_name = payload.old_name.strip()
    new_name = payload.new_name.strip()
    if not old_name or not new_name:
        raise HTTPException(status_code=400, detail='Both old and new task names are required')

    events = db.scalars(
        select(MaintenanceEvent)
        .where(MaintenanceEvent.performed_by_user_id == current_user.id)
    ).all()
    updated_events = 0
    for event in events:
        updated = False
        tasks = [part.strip() for part in event.event_type.split(',')]
        normalized_tasks: list[str] = []
        for task in tasks:
            if not task:
                continue
            if task.lower() == old_name.lower():
                normalized_tasks.append(new_name)
                updated = True
            else:
                normalized_tasks.append(task)
        if updated:
            event.event_type = ', '.join(normalized_tasks)
            updated_events += 1
    templates = db.scalars(
        select(MaintenanceTaskTemplate).where(MaintenanceTaskTemplate.owner_user_id == current_user.id)
    ).all()
    for template in templates:
        if template.task_name.strip().lower() == old_name.lower():
            template.task_name = new_name

    db.commit()
    return {'updated_events': updated_events}


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
            asset_events = db.scalars(
                select(MaintenanceEvent)
                .where(MaintenanceEvent.asset_id == asset.id)
                .order_by(desc(MaintenanceEvent.performed_at))
            ).all()
            last_event = next((
                event for event in asset_events
                if schedule.title.strip().lower() in [task.strip().lower() for task in event.event_type.split(',')]
            ), None)
            status_value = evaluate_schedule_status(
                schedule,
                asset,
                meter_map,
                last_event,
                datetime.utcnow(),
                due_soon_window_days=current_user.upcoming_task_window_days,
            )
            if status_value == 'due_soon' and schedule.interval_days and last_event:
                due_date = last_event.performed_at + timedelta(days=schedule.interval_days)
                if due_date > datetime.utcnow() + timedelta(days=current_user.upcoming_task_window_days):
                    status_value = 'not_due'
            elif status_value == 'due_soon' and schedule.interval_days and not last_event:
                due_date = asset.created_at + timedelta(days=schedule.interval_days)
                if due_date > datetime.utcnow() + timedelta(days=current_user.upcoming_task_window_days):
                    status_value = 'not_due'
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

    recent_events = db.execute(
        select(MaintenanceEvent, Asset.name)
        .join(Asset, Asset.id == MaintenanceEvent.asset_id)
        .where(Asset.owner_user_id == current_user.id)
        .order_by(desc(MaintenanceEvent.performed_at))
        .limit(10)
    ).all()
    recent_items = [
        DashboardOut.RecentEventItem(
            id=event.id,
            asset_id=event.asset_id,
            asset_name=asset_name,
            performed_at=event.performed_at,
            event_type=event.event_type,
            notes=event.notes,
            completion_meter_value=event.completion_meter_value,
        )
        for event, asset_name in recent_events
    ]
    return DashboardOut(due_soon=due_soon, overdue=overdue, recent_events=recent_items)


@router.get('/alerts')
def alerts(data: DashboardOut = Depends(dashboard)):
    return {'due_soon': data.due_soon, 'overdue': data.overdue}
