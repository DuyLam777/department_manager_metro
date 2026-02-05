# Metro Department Manager

A comprehensive human resources and organizational management system for managing employees, departments, and hierarchical relationships.

## Table of Contents

- [Features](#features)
- [Running with Docker](#running-with-docker)
- [Sharing port with Ngrok](#sharing-port-with-ngrok)
- [Run local development](#run-local-development)
- [Default admin credentials](#default-admin-credentials)
- [Project structure](#project-structure)
- [Backend endpoints](#backend-endpoints)
- [License](#license)

---

## Features

- Department management with hierarchical (parent / child) departments
- Employee management and profiles (including photo upload + cropping)
- Role-based authentication (admin vs regular users) using JWT
- Soft-deletion (archive / restore) for records
- Search and filters (by name, email, position, department)
- RESTful API built with FastAPI and a React + Vite frontend

---

## Running with Docker

Recommended: use Docker Compose to build and run the whole stack.

Start (build and run):
```bash
# Modern Docker CLI
docker compose up --build

# Legacy docker-compose (if present)
docker-compose up --build
```

Stop and remove containers, networks, and volumes created by Compose (reset to a fresh state):
```bash
# Modern Docker CLI — removes anonymous and named volumes created by Compose
docker compose down --volumes

# Legacy docker-compose:
docker-compose down -v
```

Optional: remove images built by compose as well:
```bash
docker compose down --rmi all --volumes --remove-orphans
```

Remove a single container and its anonymous volumes:
```bash
# stop container
docker stop <container_name_or_id>

# remove container and anonymous volumes
docker rm -v <container_name_or_id>

# force stop + remove in one step
docker rm -f -v <container_name_or_id>
```

Inspect and remove volumes (be careful — data is permanent):
```bash
docker volume ls
docker volume rm <volume_name>
# to delete unused volumes interactively:
docker volume prune
```

Notes and tips:
- Prefer `docker compose down --volumes` for this project because it targets only the resources created by the compose file.
- If your DB is persisted in a named volume defined in `docker-compose.yml`, removing that volume will reset the database to an empty state.
- After cleaning, rebuild and start fresh:
```bash
docker compose up --build
```

---

## Sharing port with Ngrok

If you need to share your local frontend (or backend) with external users or test webhooks, use ngrok to forward a local port to a public URL.

1. Install ngrok from https://ngrok.com
2. (Optional) Authenticate your ngrok client with your authtoken:
```bash
ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
```
3. Start a tunnel that forwards traffic to your local frontend port (3000):
```bash
ngrok http 3000
```

Ngrok will print one or more forwarding URLs (e.g. `https://abcd-1234.ngrok.io`). Share the `https` URL to let remote users access your locally running frontend.

Notes:
- To expose the backend instead, run `ngrok http 8000`.
- Make sure your CORS configuration and any host-based checks accept requests from the forwarded host if necessary.
- Free ngrok sessions have limitations; if you need persistent subdomains or long sessions, consider a paid plan.

---

## Run local development

Backend (FastAPI + Uvicorn):
```bash
cd backend

# Install dependencies as appropriate (example):
# pip install -r requirements.txt
# or use your environment manager: poetry install

# Run development server
uv run uvicorn app.main:app --reload

# Default: http://localhost:8000
```

Frontend (React + Vite):
```bash
cd frontend
npm install
npm run dev

# Vite dev server default: http://localhost:5173
# If frontend is served via this project's Docker/nginx config, it may be available at http://localhost:3000
```

---

## Default admin credentials

Use these seeded accounts for development/testing only. Change or disable in production.

| Username      | Password         |
|---------------|------------------|
| `admin`       | `Admin@1234`     |
| `truongphong` | `TruongPhong@123`|

---

## Project structure

```
department_manager_metro/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI entry point
│   │   ├── config/           # Database & settings
│   │   ├── domain/           # SQLAlchemy models
│   │   ├── routes/           # API endpoints
│   │   ├── service/          # Business logic
│   │   ├── repo/             # Data access layer
│   │   └── seed.py           # Database seeding
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.jsx          # Entry point
│   │   ├── App.jsx           # Main component
│   │   ├── components/       # UI components
│   │   └── hooks/            # Custom React hooks
│   ├── package.json
│   ├── vite.config.js
│   ├── nginx.conf
│   └── Dockerfile
└── docker-compose.yml
```

---

## Backend endpoints

Common endpoints (subject to change — check `backend/app/routes` for the most up-to-date routes):

- `POST /auth/login` — Authenticate and receive JWT token
- `GET /users` — List users
- `POST /users` — Create user
- `GET /departments` — List departments
- `POST /departments` — Create department
- `GET /sub_departments` — List sub-departments
- `POST /upload` — Upload profile image
- `GET /settings` — Get app settings

Example: call a protected endpoint using curl (replace `<TOKEN>`):
```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8000/users
```

---

## License

This project is proprietary software. Contact the project owner for licensing and distribution details.