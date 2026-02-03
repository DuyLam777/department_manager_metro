from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.config.database import Base, SessionLocal, engine
from app.domain.app_settings import (
    AppSettings,  # noqa: F401 - needed for table creation
)
from app.domain.department import Department  # noqa: F401 - needed for table creation
from app.domain.sub_department import (
    SubDepartment,  # noqa: F401 - needed for table creation
)
from app.domain.user import User  # noqa: F401 - needed for table creation
from app.routes import auth, departments, settings, sub_departments, uploads, users
from app.seed import seed_data


def run_migrations(db):
    """Run manual migrations for schema changes."""
    inspector = inspect(engine)

    # Migration: Add display_order column to departments table
    dept_columns = [col["name"] for col in inspector.get_columns("departments")]
    if "display_order" not in dept_columns:
        db.execute(
            text(
                "ALTER TABLE departments ADD COLUMN display_order INTEGER DEFAULT 0 NOT NULL"
            )
        )
        db.commit()

    # Migration: Add location column to departments table (renamed from floor)
    if "location" not in dept_columns:
        db.execute(text("ALTER TABLE departments ADD COLUMN location TEXT"))
        db.commit()
        # Copy data from floor to location if floor exists
        if "floor" in dept_columns:
            db.execute(
                text("UPDATE departments SET location = floor WHERE floor IS NOT NULL")
            )
            db.commit()

    # Migration: Add location column to sub_departments table (renamed from floor)
    sub_dept_columns = [col["name"] for col in inspector.get_columns("sub_departments")]
    if "location" not in sub_dept_columns:
        db.execute(text("ALTER TABLE sub_departments ADD COLUMN location TEXT"))
        db.commit()
        # Copy data from floor to location if floor exists
        if "floor" in sub_dept_columns:
            db.execute(
                text(
                    "UPDATE sub_departments SET location = floor WHERE floor IS NOT NULL"
                )
            )
            db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables and seed data on startup."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        run_migrations(db)
        seed_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="AnhBi User Management API",
    description="User management system with roles, relationships, and authentication",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(sub_departments.router)
app.include_router(uploads.router)
app.include_router(settings.router)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
