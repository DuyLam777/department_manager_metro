from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.database import Base, SessionLocal, engine
from app.domain.app_settings import (
    AppSettings,  # noqa: F401 - needed for table creation
)
from app.domain.department import Department  # noqa: F401 - needed for table creation
from app.domain.group import Group  # noqa: F401 - needed for table creation
from app.domain.sub_department import (
    SubDepartment,  # noqa: F401 - needed for table creation
)
from app.domain.user import User  # noqa: F401 - needed for table creation
from app.domain.user_group import UserGroup  # noqa: F401 - needed for table creation
from app.domain.user_sub_department import (
    UserSubDepartment,  # noqa: F401 - needed for table creation
)
from app.routes import auth, departments, groups, settings, sub_departments, uploads, users
from app.seed import seed_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables and seed data on startup."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Metro Department Manager API",
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
app.include_router(groups.router)
app.include_router(uploads.router)
app.include_router(settings.router)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
