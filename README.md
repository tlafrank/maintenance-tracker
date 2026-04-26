# Maintenance Tracker
 
A web-first maintenance tracking application for equipment and vehicles such as:

- Motorbikes
- Cars
- Boats
- EWPs
- Trailers
- Generators
- Other assets with distance-, hours-, or cycle-based servicing needs

The system allows users to register assets, define maintenance schedules, record completed work, and view due or overdue maintenance while logged in.

This project is designed as a Docker-hosted application running on an Ubuntu server on a LAN, with an architecture that can later support internet-facing deployment and a future iPhone app.

---

## Purpose

The goal of this project is to provide a simple but extensible maintenance management app for personal, household, workshop, or small team use.

### Terminology

- **Service Trigger (asset-level):** what usage an asset accumulates. Allowed values are **Distance**, **Hours**, or **Cycles**.
- **Reading:** a recorded usage value against the asset’s Service Trigger.
- **Maintenance task:** a single actionable item such as _change oil_, _check tyres_, or _replace filters_.
- **Maintenance activity:** one recorded service instance that may contain one or more maintenance tasks.
- **Service Interval (task-level):** when a maintenance task becomes due; can be **time-based**, **usage-based**, or **both** (whichever comes first).

### MVP capabilities

- Multi-user authentication (email/password + JWT)
- Asset registration and categorisation
- Maintenance reminders based on:
  - Time-based maintenance intervals
  - Usage-based maintenance intervals (Distance / Hours / Cycles)
- Recording maintenance activities and safety checks
- Viewing maintenance history
- Tracking current service-trigger readings such as distance, hours, or cycles
- Generating upcoming and overdue alerts visible when logged in
- API-first backend to support future mobile clients
- Docker deployment on a private Ubuntu server

---

## Confirmed architecture and product decisions

- **Multi-user:** Yes
- **Shared assets between users:** Not in MVP (future enhancement)
- **Notifications:** In-app only while logged in
- **Attachments:** No files, only text notes for completed activities/checks
- **Checklist templates:** Not required for MVP
- **Meter entry:** Manual only
- **Hosting:** Docker containers on Ubuntu Server
- **Network posture:** LAN only initially
- **Security posture:** Build with internet hardening in mind
- **Mobile direction:** Web first, future iPhone app via API reuse

---

## Stack

- **Frontend:** React + Vite
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL
- **ORM / migrations:** SQLAlchemy + Alembic
- **Authentication:** JWT-based auth
- **Reverse proxy:** Nginx
- **Container orchestration:** Docker Compose

---

## Repository layout

```text
maintenance-tracker/
├─ README.md
├─ docker-compose.yml
├─ .env.example
├─ frontend/
├─ backend/
├─ nginx/
├─ scripts/
└─ docs/
```

---

## Quick start

1. Copy environment file:

```bash
cp .env.example .env
```

2. Start the stack:

```bash
./scripts/dev-up.sh
```

3. Open the app in browser:

- `http://localhost`

4. Stop the stack:

```bash
./scripts/dev-down.sh
```

5. (Optional) Back up database:

```bash
./scripts/backup-db.sh
```

---


## Public-facing Nginx deployment notes

The stack now supports running behind a public-facing Nginx reverse proxy while keeping frontend and API behavior unchanged.

### Frontend build-time variables

Set these in `.env` before `docker compose up -d --build`:

- `VITE_API_BASE_URL` (default: `/api`)
  - Keep this as `/api` when Nginx serves frontend and API on the same origin.
  - Use a full URL only if your API is hosted on a different origin.
- `VITE_APP_BASE_PATH` (default: `/`)
  - Use `/` for root-hosted apps.
  - Use a subpath like `/maintenance/` only when your public Nginx mounts the app under a path prefix.


### Public proxy network

The `frontend` service is attached to an external Docker network for public reverse proxies:

- Env var: `PROXY_PUBLIC_NETWORK`
- Default network name: `proxy-public`

Create the network once on the host if it does not exist:

```bash
docker network create proxy-public
```

If you use a different network name, set it in `.env` and recreate frontend:

```bash
PROXY_PUBLIC_NETWORK=my-public-network
docker compose up -d --build frontend
```


### Control self-service registration

For internet-facing deployment, you can enable or disable public self-service account creation with one backend environment variable:

```env
REGISTRATION_ENABLED=true
```

- `true` (default): anyone who can reach the app can use the register form.
- `false`: register UI is hidden and `POST /api/auth/register` returns HTTP 403.

Recommended approach for public exposure:

1. Set `REGISTRATION_ENABLED=false`.
2. Create users through an admin-only process (for now, temporarily toggle it on to add users, then set back to false).
3. Keep strong JWT secret and HTTPS on the public reverse proxy.

### Backend CORS for public domains

Set `CORS_ORIGINS` as a comma-separated list including every browser origin that can load the app, for example:

```env
CORS_ORIGINS=https://maintenance.example.com,https://www.maintenance.example.com,http://localhost
```

### Rebuild after env changes

Vite variables are baked into the frontend build, so rebuild the frontend image after changing `VITE_*` variables:

```bash
docker compose up -d --build frontend nginx
```

## Monitoring authentication logs

Login and registration events are logged by the backend service (`app.auth` logger).

Follow auth-related log lines live:

```bash
docker compose logs -f backend | grep "app.auth"
```

Show only failed login attempts:

```bash
docker compose logs backend --since=1h | grep "login_failed"
```

Show successful logins:

```bash
docker compose logs backend --since=1h | grep "login_success"
```

Each log line includes email, source IP, and user-agent for login attempts.

---

## Remote client troubleshooting

If users access the app from another machine on your LAN and you see Vite websocket errors such as:

- `failed to connect to websocket`
- `localhost:5173` websocket failures from the browser

rebuild/restart the frontend container. The frontend image now serves a production build (`npm run preview`) instead of dev HMR mode, which avoids remote websocket/HMR issues.

```bash
docker compose up -d --build frontend nginx
```

If registration still fails, inspect backend auth logs:

```bash
docker compose logs -f backend | grep -E "app.auth|register|login"
```

## API surface (MVP)

## Backend restart loop troubleshooting

If the backend restarts with Alembic error `ModuleNotFoundError: No module named 'app'`, recreate the backend image so the updated Alembic path bootstrap is included:

```bash
docker compose up -d --build backend
```

Then confirm startup:

```bash
docker compose logs -f backend
```

You should see Alembic complete and then Uvicorn start instead of repeated container exits.

### Assets
- `GET /api/assets`
- `POST /api/assets`
- `GET /api/assets/{id}`
- `PUT /api/assets/{id}`
- `DELETE /api/assets/{id}` (archive)

## Registration 500 troubleshooting

If `/api/auth/register` returns 500 and backend logs mention bcrypt/passlib errors, rebuild the backend image to apply the current password hashing configuration:

```bash
docker compose up -d --build backend
```

The backend now hashes passwords with `pbkdf2_sha256` (via Passlib), avoiding bcrypt backend incompatibility and bcrypt-specific length constraints.

### Maintenance events
- `GET /api/assets/{id}/maintenance-events`
- `POST /api/assets/{id}/maintenance-events`

## API surface (MVP)

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Assets
- `GET /api/assets`
- `POST /api/assets`
- `GET /api/assets/{id}`
- `PUT /api/assets/{id}`
- `DELETE /api/assets/{id}` (archive)

### Meters / readings
- `POST /api/assets/{id}/meters`
- `GET /api/assets/{id}/meters`
- `POST /api/assets/{id}/readings`
- `GET /api/assets/{id}/readings`

### Schedules
- `GET /api/assets/{id}/schedules`
- `POST /api/assets/{id}/schedules`
- `PUT /api/schedules/{id}`
- `DELETE /api/schedules/{id}` (deactivate)

### Maintenance events
- `GET /api/assets/{id}/maintenance-events`
- `POST /api/assets/{id}/maintenance-events`

### Dashboard and alerts
- `GET /api/dashboard`
- `GET /api/alerts`

### Out of scope for MVP

## Scope

### In scope for MVP

- User authentication
- CRUD for assets
- Per-user ownership and access controls
- Reading tracking (Distance, Hours, Cycles)
- Service intervals (time-based, usage-based, or both)
- Due soon and overdue dashboard visibility (whichever interval basis is met first)
- Maintenance event logging with notes
- API-first implementation

### Out of scope for MVP

- Native iPhone / Android app
- Asset sharing between users
- File attachments
- Email / push notifications
- Telematics integrations
- Complex workflow engines

---

## Notes

- LAN-first deployment.
- In-app due/overdue visibility only (no email/push for MVP).
- No asset sharing in MVP; each asset belongs to one user.
- See `docs/architecture.md` for component and due-logic notes.
