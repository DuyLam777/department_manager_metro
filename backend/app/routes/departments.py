from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.domain.department import Department
from app.domain.sub_department import SubDepartment
from app.domain.user import User
from app.repo import department_repo
from app.routes.auth import require_admin

router = APIRouter(prefix="/departments", tags=["departments"])


class DepartmentCreateRequest(BaseModel):
    name: str
    description: str | None = None


class DepartmentUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None


def _active_sub_departments(department) -> list:
    """Sub-departments that are not deleted and not placeholder (Unassigned has no sub-departments)."""
    return [s for s in department.sub_departments if not s.deleted and not s.is_placeholder]


def _department_user_count(department) -> int:
    """Count users: direct + users in non-deleted sub_departments."""
    direct = len(department.users)
    sub_users = sum(len(sub.users) for sub in _active_sub_departments(department))
    return direct + sub_users


@router.get("")
def list_departments(db: Session = Depends(get_db)):
    """Get all non-deleted departments with sub_departments and user counts. Read-only for all."""
    departments = department_repo.get_all_departments(db)
    return [
        {
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "is_placeholder": d.is_placeholder,
            "user_count": _department_user_count(d),
            "direct_user_count": len(d.users),
            "sub_departments": [
                {"id": s.id, "name": s.name, "description": s.description, "user_count": len(s.users)}
                for s in _active_sub_departments(d)
            ],
        }
        for d in departments
    ]


@router.get("/deleted/list")
def list_deleted_departments(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Get all soft-deleted departments (excluding placeholder). Admin only."""
    departments = department_repo.get_deleted_departments(db)
    return [
        {
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "deleted_at": d.deleted_at.isoformat() if d.deleted_at else None,
        }
        for d in departments
    ]


@router.post("/{department_id}/restore")
def restore_department(
    department_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Restore a soft-deleted department. Admin only. Cannot restore placeholder."""
    dept = db.query(Department).filter(
        Department.id == department_id,
        Department.deleted == True,
    ).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Deleted department not found")
    if dept.is_placeholder:
        raise HTTPException(status_code=400, detail="Cannot restore placeholder department")
    dept.deleted = False
    dept.deleted_at = None
    db.commit()
    db.refresh(dept)
    return {
        "message": "Department restored",
        "department": {
            "id": dept.id,
            "name": dept.name,
            "description": dept.description,
        },
    }


@router.get("/{department_id}")
def get_department(department_id: int, db: Session = Depends(get_db)):
    """Get a single department by ID. Read-only for all."""
    dept = department_repo.get_department_by_id(db, department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return {
        "id": dept.id,
        "name": dept.name,
        "description": dept.description,
        "is_placeholder": dept.is_placeholder,
        "user_count": _department_user_count(dept),
        "direct_user_count": len(dept.users),
        "sub_departments": [
            {"id": s.id, "name": s.name, "description": s.description, "user_count": len(s.users)}
            for s in _active_sub_departments(dept)
        ],
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_department(
    request: DepartmentCreateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Create a new department. Admin only."""
    existing = db.query(Department).filter(Department.name == request.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department with this name already exists")
    dept = Department(
        name=request.name,
        description=request.description,
        is_placeholder=False,
        deleted=False,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return {
        "id": dept.id,
        "name": dept.name,
        "description": dept.description,
        "is_placeholder": dept.is_placeholder,
        "user_count": 0,
        "direct_user_count": 0,
        "sub_departments": [],
    }


@router.put("/{department_id}")
def update_department(
    department_id: int,
    request: DepartmentUpdateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Update a department. Admin only. Cannot update placeholder."""
    dept = department_repo.get_department_by_id(db, department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    if dept.is_placeholder:
        raise HTTPException(status_code=400, detail="Cannot edit placeholder department")
    if request.name is not None:
        other = db.query(Department).filter(Department.name == request.name, Department.id != department_id).first()
        if other:
            raise HTTPException(status_code=400, detail="Department with this name already exists")
        dept.name = request.name
    if request.description is not None:
        dept.description = request.description
    db.commit()
    db.refresh(dept)
    return {
        "id": dept.id,
        "name": dept.name,
        "description": dept.description,
        "is_placeholder": dept.is_placeholder,
        "user_count": _department_user_count(dept),
        "direct_user_count": len(dept.users),
        "sub_departments": [
            {"id": s.id, "name": s.name, "description": s.description, "user_count": len(s.users)}
            for s in _active_sub_departments(dept)
        ],
    }


@router.delete("/{department_id}")
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Soft-delete a department. Reassign sub_departments and users to placeholder. Admin only."""
    dept = department_repo.get_department_by_id(db, department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    if dept.is_placeholder:
        raise HTTPException(status_code=400, detail="Cannot delete placeholder department")

    placeholder = department_repo.get_placeholder_department(db)
    if not placeholder:
        raise HTTPException(status_code=500, detail="Placeholder department not found")

    # Reassign sub_departments to placeholder
    for sub in dept.sub_departments:
        if not sub.deleted:
            sub.department_id = placeholder.id

    # Reassign direct users to placeholder (no sub_department)
    for u in dept.users:
        u.department_id = placeholder.id
        u.sub_department_id = None

    dept.deleted = True
    dept.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Department deleted (soft). Sub-departments and users reassigned to Unassigned."}
