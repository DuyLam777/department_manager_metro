from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.repo import department_repo

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("")
def list_departments(db: Session = Depends(get_db)):
    """Get all departments."""
    departments = department_repo.get_all_departments(db)
    return [
        {
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "user_count": len(d.users),
        }
        for d in departments
    ]
