# Metro Department Manager

A comprehensive human resources and organizational management system for managing employees, departments, and their hierarchical relationships.

## Features

- **Department Management**: Hierarchical department structures with sub-departments
- **Employee Management**: Track and organize employees across organizational units
- **User Authentication**: Role-based access control (admin vs. regular users)
- **Profile Management**: Employee profiles with photo upload and cropping
- **Soft Deletion**: Archive and restore records
- **Search & Filtering**: Find users by name, email, position, or department

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.14+)
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Server**: Uvicorn

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: CSS modules
- **Image Processing**: react-easy-crop

### Deployment
- Docker & Docker Compose
- Nginx reverse proxy

## Getting Started

### Prerequisites

- Docker & Docker Compose (recommended)
- OR: Python 3.14+, Node.js 22+

### Option 1: Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

### Option 2: Local Development

**Backend:**
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
# Server runs at http://localhost:8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Server runs at http://localhost:5173
```

## Default Admin Credentials

| Username | Password |
|----------|----------|
| admin | Admin@1234 |
| truongphong | TruongPhong@123 |

## Project Structure

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

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /auth/login` | Admin login |
| `GET /users` | List all users |
| `POST /users` | Create user |
| `GET /departments` | List departments |
| `POST /departments` | Create department |
| `GET /sub_departments` | List sub-departments |
| `POST /upload` | Upload profile image |
| `GET /settings` | Get app settings |

## License

This project is proprietary software.
