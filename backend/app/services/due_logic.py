from datetime import datetime, timedelta

from app.models.models import Asset, MaintenanceEvent, MaintenanceSchedule, Meter


def evaluate_schedule_status(
    schedule: MaintenanceSchedule,
    asset: Asset,
    latest_meter_values: dict[str, float],
    last_event: MaintenanceEvent | None,
    now: datetime,
    due_soon_window_days: int = 14,
) -> str:
    due_states: list[str] = []

    if schedule.interval_days is not None:
        baseline = (last_event.performed_at if last_event else asset.created_at)
        due_date = baseline + timedelta(days=schedule.interval_days)
        due_soon_date = due_date - timedelta(days=(schedule.due_soon_threshold_days or due_soon_window_days))
        if now >= due_date:
            due_states.append('overdue')
        elif now >= due_soon_date:
            due_states.append('due_soon')

    if schedule.interval_distance is not None:
        km = latest_meter_values.get('distance')
        baseline = last_event.completion_meter_value if last_event and last_event.completion_meter_value is not None else 0
        if km is not None:
            due_at = baseline + schedule.interval_distance
            due_soon_at = due_at - (schedule.due_soon_threshold_distance or 0)
            if km >= due_at:
                due_states.append('overdue')
            elif km >= due_soon_at:
                due_states.append('due_soon')

    if schedule.interval_hours is not None:
        hours = latest_meter_values.get('hours')
        baseline = last_event.completion_meter_value if last_event and last_event.completion_meter_value is not None else 0
        if hours is not None:
            due_at = baseline + schedule.interval_hours
            due_soon_at = due_at - (schedule.due_soon_threshold_hours or 0)
            if hours >= due_at:
                due_states.append('overdue')
            elif hours >= due_soon_at:
                due_states.append('due_soon')

    if 'overdue' in due_states:
        return 'overdue'
    if 'due_soon' in due_states:
        return 'due_soon'
    return 'not_due'


def latest_meter_map(meters: list[Meter]) -> dict[str, float]:
    result: dict[str, float] = {}
    for meter in meters:
        if meter.current_value is None:
            continue
        result[meter.meter_type] = float(meter.current_value)
    return result
