# Maintenance Tracker MVP Architecture

## Components

- **frontend**: React + Vite app for login, dashboard, asset and maintenance workflows.
- **backend**: FastAPI REST API with JWT authentication, auth event logging (`app.auth`), and due logic services.
- **db**: PostgreSQL persistent data store.
- **nginx**: Reverse proxy routing `/api` to backend and remaining paths to frontend.

## Data ownership

Assets are user-owned (`assets.owner_user_id`) and every asset-related endpoint validates ownership in backend route handlers.

## Due logic

Due state is calculated dynamically in the backend using:

- latest maintenance event for the schedule
- latest known service-trigger reading values
- current time

The earliest due condition across time-based and usage-based service intervals (distance/hours/cycles) determines the active status.
