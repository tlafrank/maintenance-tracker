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

This project is being designed as a Docker-hosted application running on an Ubuntu server on a LAN, with an architecture that can later support internet-facing deployment and a future iPhone app.

---

## Purpose

The goal of this project is to provide a simple but extensible maintenance management app for personal, household, workshop, or small team use.

The app must support:

- Multiple users
- Asset registration and categorisation
- Maintenance reminders based on:
  - Date/time
  - Engine hours
  - Distance
- Recording maintenance activities and safety checks
- Viewing maintenance history
- Tracking current meter values such as odometer or hour meter
- Generating upcoming and overdue alerts visible when logged in
- Supporting future mobile clients, especially iPhone
- Being deployable on a private Ubuntu server using Docker

Examples:

- Remind me every 5,000 km to service my motorbike
- Remind me every 12 months to inspect trailer bearings
- Remind me every 50 hours to service an EWP
- Record that a pre-start inspection was completed today
- Show all overdue items across all assets visible to me

---

## Confirmed Architecture and Product Decisions

The following decisions are locked in for the initial build:

- **Multi-user:** Yes
- **Shared assets between users:** Not in MVP, future enhancement
- **Notifications:** In-app only while logged in
- **Attachments:** No files, only text notes for completed activities/checks
- **Checklist templates:** Not required for MVP
- **Meter entry:** Manual only
- **Hosting:** Docker containers on Ubuntu Server
- **Network posture:** LAN only initially
- **Security posture:** Structure the application so it can later be safely prepared for internet-facing deployment
- **Mobile direction:** Web first, future iPhone app supported by API-first backend design

---

## Project Objectives

### Primary objectives

- Build a working multi-user web application for maintenance tracking
- Make it easy to host privately on an Ubuntu server using Docker
- Keep the first version simple, clear, and reliable
- Design the backend as an API so an iPhone app can be added later

### Secondary objectives

- Support multiple asset types through a generic asset model
- Allow configurable maintenance rules and check intervals
- Store a full maintenance history
- Provide a straightforward UI for adding readings and recording maintenance
- Be suitable for self-hosting on a LAN
- Avoid design choices that would make later internet exposure difficult

---

## Initial Scope

### In scope for MVP

- User authentication
- CRUD for assets/items
- Asset categories and custom fields
- Asset ownership per user
- Meter tracking:
  - Odometer
  - Hour meter
  - Optional calendar-only assets
- Maintenance schedule definitions
- Due logic based on:
  - Date
  - Distance
  - Hours
  - Combination of triggers
- Maintenance event logging
- Text notes for completed maintenance/checks
- Dashboard showing:
  - Due soon items
  - Overdue items
  - Recently completed maintenance
- Manual entry of readings
- In-app alerts only
- REST API for web frontend and future mobile app
- Docker-based development and deployment
- LAN deployment on Ubuntu Server

### Out of scope for MVP

- Native iPhone app
- Android app
- Asset sharing between users
- File attachments
- Checklist templates
- Email notifications
- Push notifications
- External telematics integrations
- Predictive maintenance analytics
- Complex fleet compliance workflows
- SaaS billing / tenancy

These can be added later if the core platform proves useful.

---

## Example Use Cases

### Personal use
A user wants to track service intervals for a motorbike, car, boat, and trailer from one dashboard.

### Workshop or family use
Multiple users log into the same system, but each user initially manages only their own assets.

### Plant / equipment use
A user wants to track operating hours and routine checks for an EWP, generator, or compressor.

### Mixed asset use
A user wants one system that can handle both odometer-based and hour-based assets, while also allowing time-based inspections.

---

## Proposed Architecture

This project will be built as a containerised web application hosted on Ubuntu Server.

### High-level architecture

- **Frontend:** Web UI
- **Backend:** REST API
- **Database:** Relational database
- **Hosting:** Docker Compose on Ubuntu Server
- **Reverse proxy:** Nginx
- **Future expansion:** iPhone app consuming the same backend API

### Proposed initial stack

#### Recommended stack
- **Frontend:** React + Vite
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL
- **ORM / migrations:** SQLAlchemy + Alembic
- **Authentication:** JWT-based auth
- **Container orchestration:** Docker Compose
- **Reverse proxy:** Nginx
- **Background jobs:** Not required for MVP

### Why this stack

- FastAPI is clean, well-suited to APIs, and supports future mobile clients well
- PostgreSQL is reliable and flexible for relational asset and maintenance data
- React provides a straightforward path to a responsive web UI
- Docker Compose is simple for self-hosted Ubuntu deployments
- This stack is mature, well-documented, and appropriate for LAN-first deployment

### Deployment model

Initial deployment target:

- Single Ubuntu server
- Docker Compose based deployment
- Private LAN access only
- Environment variables for configuration
- Persistent database volume
- Reverse proxy in front of API and frontend

Later enhancements may include:

- HTTPS termination
- Secure internet exposure
- Email or push notifications
- Asset sharing
- Native mobile app

---

## Core Domain Model

### Main entities

#### User
Represents an authenticated person using the application.

Possible fields:
- id
- email
- password_hash
- display_name
- is_active
- created_at
- updated_at

#### Asset
Represents a maintained item.

Examples:
- Motorbike
- Car
- Boat
- EWP
- Trailer
- Generator

Possible fields:
- id
- owner_user_id
- name
- asset_type
- manufacturer
- model
- year
- registration_or_serial
- notes
- created_at
- updated_at
- archived_at

#### Meter
Represents a tracked meter for an asset.

Examples:
- Odometer in km
- Engine hours

Possible fields:
- id
- asset_id
- meter_type
- unit
- current_value
- created_at
- updated_at

#### MeterReading
Stores historical readings.

Possible fields:
- id
- asset_id
- meter_id
- reading_value
- reading_timestamp
- source
- notes
- created_at

#### MaintenanceSchedule
Defines a recurring or one-off rule.

Examples:
- Oil change every 5,000 km
- Annual inspection every 12 months
- Major service every 200 hours
- Daily or periodic check

Possible fields:
- id
- asset_id
- title
- description
- trigger_type
- interval_days
- interval_distance
- interval_hours
- due_soon_threshold_days
- due_soon_threshold_distance
- due_soon_threshold_hours
- active
- created_at
- updated_at

#### MaintenanceEvent
Represents completed maintenance or a completed check.

Possible fields:
- id
- asset_id
- schedule_id
- performed_at
- meter_reading_at_completion
- notes
- performed_by_user_id
- event_type
- created_at

#### Alert
Represents a due or overdue condition generated from schedule logic.

Possible fields:
- id
- asset_id
- schedule_id
- status
- due_at_date
- due_at_meter
- generated_at
- resolved_at

---

## Functional Requirements

### User management
- Register users
- Log in and log out
- Restrict each user to their own assets in MVP
- Prepare the data model so asset sharing can be added later

### Asset management
- Create, edit, archive, and view assets
- Support different asset categories
- Support flexible asset metadata

### Meter tracking
- Record odometer and/or hour readings manually
- Show latest reading and reading history
- Allow assets with no live meter, using date-only scheduling

### Maintenance scheduling
- Create schedules based on:
  - Calendar intervals
  - Distance intervals
  - Hour intervals
  - Multiple conditions where the earliest due threshold wins
- Configure “due soon” thresholds

### Maintenance records
- Log completed maintenance
- Link completion to a schedule where appropriate
- Record ad hoc maintenance not linked to a recurring schedule
- Add text notes for conducted activities
- Keep full history per asset

### Alerts and dashboard
- Show due soon alerts
- Show overdue alerts
- Allow alerts to be resolved through recorded maintenance
- Show upcoming maintenance across all assets owned by the logged-in user
- No email, SMS, or push notifications in MVP

### Checks
- Record simple recurring checks as maintenance events
- No structured checklist engine in MVP

---

## Non-Functional Requirements

- Must run in Docker on Ubuntu Server
- Must be easy to stand up locally for development
- Must support persistent storage
- Must have an API-first backend
- Must be structured to support a future iPhone app
- Must be suitable for LAN-only deployment in MVP
- Must avoid insecure shortcuts that would make later internet exposure difficult
- Must support backup and restore of application data

---

## API Direction

The backend should be designed as a REST API from the beginning.

Indicative endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /assets`
- `POST /assets`
- `GET /assets/{id}`
- `PUT /assets/{id}`
- `POST /assets/{id}/readings`
- `GET /assets/{id}/schedules`
- `POST /assets/{id}/schedules`
- `POST /assets/{id}/maintenance-events`
- `GET /alerts`
- `GET /dashboard`

This will allow a future iPhone app to reuse the same API and business logic.

---

## UI Direction

The web app should be mobile-friendly from the start.

### Key screens
- Login
- Register
- Dashboard
- Asset list
- Asset detail
- Add/edit asset
- Add reading
- Schedule list
- Add/edit schedule
- Maintenance history
- Record completed maintenance
- Alerts / due items

### UX principles
- Fast to enter a reading
- Fast to record a completed service
- Minimal clicks to see what is due
- Clear distinction between due soon and overdue
- Works well on desktop and phone browser

---

## Suggested Repository Structure

```text
maintenance-tracker/
├─ README.md
├─ docker-compose.yml
├─ .env.example
├─ frontend/
│  ├─ Dockerfile
│  ├─ src/
│  └─ package.json
├─ backend/
│  ├─ Dockerfile
│  ├─ app/
│  │  ├─ api/
│  │  ├─ core/
│  │  ├─ models/
│  │  ├─ schemas/
│  │  ├─ services/
│  │  └─ main.py
│  ├─ alembic/
│  └─ requirements.txt
├─ nginx/
│  └─ default.conf
├─ docs/
│  ├─ architecture.md
│  ├─ api.md
│  └─ product-notes.md
└─ scripts/
   ├─ dev-up.sh
   ├─ dev-down.sh
   └─ backup-db.sh
