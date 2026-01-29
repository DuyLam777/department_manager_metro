# AnhBi Backend

User management backend with FastAPI, SQLite, and JWT authentication.

## Development

```bash
uv sync
uv run uvicorn app.main:app --reload
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI entry point
│   ├── config/          # Configuration settings
│   ├── domain/          # Entities and models
│   ├── repo/            # Database repositories
│   ├── service/         # Business logic
│   └── routes/          # API endpoints
├── pyproject.toml
└── README.md
```
