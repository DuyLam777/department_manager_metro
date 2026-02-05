from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.domain.department import Department
from app.domain.sub_department import SubDepartment
from app.domain.user_sub_department import UserSubDepartment
from app.repo import department_repo
from app.routes.auth import require_admin

router = APIRouter(prefix="/departments", tags=["departments"])


class DepartmentCreateRequest(BaseModel):
    name: str
    description: str | None = None
    profile_img: str | None = None
    location: str | None = None


class DepartmentUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    profile_img: str | None = None
    location: str | None = None


class DepartmentReorderRequest(BaseModel):
    """List of department IDs in the desired order (excluding placeholder)."""

    department_ids: list[int]


def _active_sub_departments(department) -> list:
    """Sub-departments that are not deleted and not placeholder."""
    return [
        s for s in department.sub_departments if not s.deleted and not s.is_placeholder
    ]


def _active_users_in_sub_department(sub_department) -> list:
    """Get active (non-deleted) users in a sub-department."""
    users = []
    for assignment in sub_department.user_assignments:
        if assignment.user and not assignment.user.deleted:
            users.append(assignment.user)
    return users


def _unique_active_users_count(department) -> int:
    """Count unique active users in a department (across all non-placeholder sub-departments).

    A user may be in multiple sub-departments but should only be counted once per department.
    """
    user_ids = set()
    for sub in _active_sub_departments(department):
        for assignment in sub.user_assignments:
            if assignment.user and not assignment.user.deleted:
                user_ids.add(assignment.user.id)
    return len(user_ids)


def _sub_department_user_count(sub_department) -> int:
    """Count active users in a sub-department."""
    return len(_active_users_in_sub_department(sub_department))


@router.get("")
def list_departments(db: Session = Depends(get_db)):
    """Get all non-deleted departments with sub_departments and user counts. Read-only for all."""
    departments = department_repo.get_all_departments(db)
    return [
        {
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "profile_img": d.profile_img,
            "location": d.location,
            "is_placeholder": d.is_placeholder,
            "user_count": _unique_active_users_count(d),
            "sub_departments": [
                {
                    "id": s.id,
                    "name": s.name,
                    "description": s.description,
                    "profile_img": s.profile_img,
                    "location": s.location,
                    "user_count": _sub_department_user_count(s),
                }
                for s in _active_sub_departments(d)
            ],
        }
        for d in departments
    ]


@router.put("/reorder")
def reorder_departments(
    request: DepartmentReorderRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Reorder departments by setting display_order. Admin only.

    The placeholder department ('Chưa phân công') cannot be reordered and is always last.
    """
    # Update display_order for each department in the list
    for index, dept_id in enumerate(request.department_ids):
        dept = (
            db.query(Department)
            .filter(
                Department.id == dept_id,
                Department.deleted == False,
                Department.is_placeholder == False,
            )
            .first()
        )
        if dept:
            dept.display_order = index

    db.commit()
    return {"message": "Departments reordered successfully"}


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
    dept = (
        db.query(Department)
        .filter(
            Department.id == department_id,
            Department.deleted == True,
        )
        .first()
    )
    if not dept:
        raise HTTPException(status_code=404, detail="Deleted department not found")
    if dept.is_placeholder:
        raise HTTPException(
            status_code=400, detail="Cannot restore placeholder department"
        )
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


@router.delete("/{department_id}/permanent")
def permanent_delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Permanently delete a soft-deleted department. Admin only. Cannot delete placeholder."""
    dept = (
        db.query(Department)
        .filter(
            Department.id == department_id,
            Department.deleted == True,
        )
        .first()
    )
    if not dept:
        raise HTTPException(status_code=404, detail="Bộ phận đã xóa không tìm thấy")
    if dept.is_placeholder:
        raise HTTPException(
            status_code=400, detail="Không thể xóa vĩnh viễn bộ phận 'Chưa phân công'"
        )
    db.delete(dept)
    db.commit()
    return {"message": "Bộ phận đã được xóa vĩnh viễn"}


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
        "profile_img": dept.profile_img,
        "location": dept.location,
        "is_placeholder": dept.is_placeholder,
        "user_count": _unique_active_users_count(dept),
        "sub_departments": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "profile_img": s.profile_img,
                "location": s.location,
                "user_count": _sub_department_user_count(s),
            }
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
        raise HTTPException(
            status_code=400, detail="Department with this name already exists"
        )
    dept = Department(
        name=request.name,
        description=request.description,
        profile_img=request.profile_img,
        location=request.location,
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
        "profile_img": dept.profile_img,
        "location": dept.location,
        "is_placeholder": dept.is_placeholder,
        "user_count": 0,
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
        raise HTTPException(
            status_code=400, detail="Cannot edit placeholder department"
        )
    if request.name is not None:
        other = (
            db.query(Department)
            .filter(Department.name == request.name, Department.id != department_id)
            .first()
        )
        if other:
            raise HTTPException(
                status_code=400, detail="Department with this name already exists"
            )
        dept.name = request.name
    if request.description is not None:
        dept.description = request.description
    if request.profile_img is not None:
        dept.profile_img = request.profile_img
    if request.location is not None:
        dept.location = request.location
    db.commit()
    db.refresh(dept)
    return {
        "id": dept.id,
        "name": dept.name,
        "description": dept.description,
        "profile_img": dept.profile_img,
        "location": dept.location,
        "is_placeholder": dept.is_placeholder,
        "user_count": _unique_active_users_count(dept),
        "sub_departments": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "profile_img": s.profile_img,
                "location": s.location,
                "user_count": _sub_department_user_count(s),
            }
            for s in _active_sub_departments(dept)
        ],
    }


@router.delete("/{department_id}")
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Soft-delete a department. Reassign user assignments from sub_departments to placeholder. Admin only."""
    dept = department_repo.get_department_by_id(db, department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    if dept.is_placeholder:
        raise HTTPException(
            status_code=400, detail="Cannot delete placeholder department"
        )

    placeholder_sub = department_repo.get_placeholder_sub_department(db)
    if not placeholder_sub:
        raise HTTPException(
            status_code=500, detail="Placeholder sub-department not found"
        )

    # Reassign all user assignments from this department's sub-departments to placeholder
    for sub in dept.sub_departments:
        if not sub.deleted:
            # Move user assignments to placeholder sub-department
            for assignment in sub.user_assignments:
                assignment.sub_department_id = placeholder_sub.id
                assignment.position = None  # Clear position when moving to unassigned
            # Soft-delete the sub-department
            sub.deleted = True
            sub.deleted_at = datetime.now(timezone.utc)

    dept.deleted = True
    dept.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {
        "message": "bộ phận đã xóa (mềm). Các Phòng và người dùng đã được chuyển sang Chưa phân công."
    }
