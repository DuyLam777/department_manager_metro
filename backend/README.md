# Metro Department Manager - Backend

FastAPI backend for the Metro Department Manager application with SQLite database and JWT authentication.

## Tech Stack

- **Framework**: FastAPI
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Server**: Uvicorn
- **Python**: 3.14+

## Development

```bash
# Install dependencies
uv sync

# Run development server with auto-reload
uv run uvicorn app.main:app --reload

# Server runs at http://localhost:8000
```

## Docker

```bash
docker build -t metro-dept-backend .
docker run -p 8000:8000 -v ./data:/app/data metro-dept-backend
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point, CORS, lifespan
│   ├── config/
│   │   ├── database.py      # SQLAlchemy engine & session
│   │   └── settings.py      # JWT & app configuration
│   ├── domain/              # SQLAlchemy models
│   │   ├── user.py          # User model (admin & regular)
│   │   ├── department.py    # Department model
│   │   ├── sub_department.py
│   │   └── app_settings.py  # App-wide settings
│   ├── routes/              # API endpoints
│   │   ├── auth.py          # Login, token validation
│   │   ├── users.py         # User CRUD, password management
│   │   ├── departments.py   # Department CRUD, reordering
│   │   ├── sub_departments.py
│   │   ├── uploads.py       # File upload handling
│   │   └── settings.py      # App settings management
│   ├── service/
│   │   └── auth_service.py  # JWT token & password utilities
│   ├── repo/                # Data access layer
│   │   ├── user_repo.py
│   │   └── sub_department_repo.py
│   └── seed.py              # Database seeding with sample data
├── pyproject.toml
├── Dockerfile
└── README.md
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Admin login, returns JWT |
| GET | `/auth/me` | Get current authenticated user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all active users |
| POST | `/users` | Create new user |
| GET | `/users/{id}` | Get user details |
| PUT | `/users/{id}` | Update user |
| DELETE | `/users/{id}` | Soft delete user |
| POST | `/users/{id}/reset-password` | Reset admin password |
| POST | `/users/{id}/set-password` | Set admin password |
| GET | `/users/deleted/list` | List deleted users |
| POST | `/users/{id}/restore` | Restore deleted user |
| DELETE | `/users/{id}/permanent` | Permanently delete user |

### Departments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/departments` | List all departments |
| POST | `/departments` | Create department |
| PUT | `/departments/{id}` | Update department |
| DELETE | `/departments/{id}` | Soft delete department |
| PUT | `/departments/reorder` | Reorder departments |

### Sub-Departments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sub_departments` | List all sub-departments |
| POST | `/sub_departments` | Create sub-department |
| PUT | `/sub_departments/{id}` | Update sub-department |
| DELETE | `/sub_departments/{id}` | Soft delete sub-department |

### File Uploads
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload profile image |
| GET | `/uploads/{filename}` | Serve uploaded file |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings` | Get app settings |
| PUT | `/settings` | Update app settings |

## Configuration

Environment variables:
- `DATABASE_URL` - Database connection string (default: SQLite)
- `SECRET_KEY` - JWT signing key
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration time

## Database

The database is automatically initialized on startup. Sample data is seeded including:
- 3 departments (Engineering, HR, Sales)
- 3 sub-departments
- 21 sample users (2 admins, 19 regular users)

Default admin credentials:
- `admin` / `Admin@1234`
- `truongphong` / `TruongPhong@123`
