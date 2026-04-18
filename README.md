# Maintenance Tracker
 
A web-first maintenance tracking application for equipment and vehicles such as:

- Motorbikes
- Cars
- Boats
- EWPs
- Trailers
- Generators
- Other assets with time, hour, distance, or date based servicing needs

The system allows users to register assets, define maintenance schedules, record completed work, and view due or overdue maintenance while logged in.

This project is designed as a Docker-hosted application running on an Ubuntu server on a LAN, with an architecture that can later support internet-facing deployment and a future iPhone app.

---

## Purpose

The goal of this project is to provide a simple but extensible maintenance management app for personal, household, workshop, or small team use.

### MVP capabilities

- Multi-user authentication (email/password + JWT)
- Asset registration and categorisation
- Maintenance reminders based on:
  - Date/time
  - Engine hours
  - Distance
- Recording maintenance activities and safety checks
- Viewing maintenance history
- Tracking current meter values such as odometer or hour meter
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

### Assets
- `GET /api/assets`
- `POST /api/assets`
- `GET /api/assets/{id}`
- `PUT /api/assets/{id}`
- `DELETE /api/assets/{id}` (archive)

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
- Meter tracking (distance, hours, date-only assets)
- Maintenance schedules (date/distance/hour or combinations)
- Due soon and overdue dashboard visibility
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
