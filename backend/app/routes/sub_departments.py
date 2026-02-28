from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.domain.group import Group
from app.domain.sub_department import SubDepartment
from app.domain.user_group import UserGroup
from app.domain.user_sub_department import UserSubDepartment
from app.repo import department_repo, sub_department_repo
from app.routes.auth import require_admin

router = APIRouter(prefix="/sub-departments", tags=["sub-departments"])


class SubDepartmentCreateRequest(BaseModel):
    name: str
    description: str | None = None
    profile_img: str | None = None
    location: str | None = None
    department_id: int


class SubDepartmentUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    profile_img: str | None = None
    location: str | None = None
    department_id: int | None = None


def _active_users_count(sub: SubDepartment) -> int:
    """Count active (non-deleted) users in a sub-department."""
    count = 0
    for assignment in sub.user_assignments:
        if assignment.user and not assignment.user.deleted:
            count += 1
    return count


def _sub_to_dict(sub: SubDepartment) -> dict:
    return {
        "id": sub.id,
        "name": sub.name,
        "description": sub.description,
        "profile_img": sub.profile_img,
        "location": sub.location,
        "department_id": sub.department_id,
        "department_name": sub.department.name if sub.department else None,
        "is_placeholder": sub.is_placeholder,
        "user_count": _active_users_count(sub),
        "group_count": sum(1 for g in sub.groups if not g.deleted),
    }


@router.get("")
def list_sub_departments(
    department_id: int | None = Query(None, description="Filter by department"),
    db: Session = Depends(get_db),
):
    """Get all non-deleted sub_departments. Read-only for all."""
    if department_id is not None:
        sub_depts = sub_department_repo.get_sub_departments_by_department_id(
            db, department_id
        )
    else:
        sub_depts = sub_department_repo.get_all_sub_departments(db)
    # Exclude placeholder sub-departments
    return [_sub_to_dict(s) for s in sub_depts if not s.is_placeholder]


@router.get("/deleted/list")
def list_deleted_sub_departments(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Get all soft-deleted sub_departments (excluding placeholder). Admin only."""
    subs = sub_department_repo.get_deleted_sub_departments(db)
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "department_id": s.department_id,
            "department_name": s.department.name if s.department else None,
            "deleted_at": s.deleted_at.isoformat() if s.deleted_at else None,
        }
        for s in subs
    ]


@router.post("/{sub_department_id}/restore")
def restore_sub_department(
    sub_department_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Restore a soft-deleted sub_department. Admin only. Cannot restore placeholder."""
    sub = (
        db.query(SubDepartment)
        .filter(
            SubDepartment.id == sub_department_id,
            SubDepartment.deleted == True,
        )
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Deleted sub-department not found")
    if sub.is_placeholder:
        raise HTTPException(
            status_code=400, detail="Cannot restore placeholder sub-department"
        )
    sub.deleted = False
    sub.deleted_at = None
    db.commit()
    db.refresh(sub)
    return {
        "message": "Sub-department restored",
        "sub_department": _sub_to_dict(sub),
    }


@router.delete("/{sub_department_id}/permanent")
def permanent_delete_sub_department(
    sub_department_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Permanently delete a soft-deleted sub_department. Admin only. Cannot delete placeholder."""

    sub = (
        db.query(SubDepartment)
        .filter(
            SubDepartment.id == sub_department_id,
            SubDepartment.deleted == True,
        )
        .first()
    )

    if not sub:
        raise HTTPException(status_code=404, detail="Phòng đã xóa không tìm thấy")

    if sub.is_placeholder:
        raise HTTPException(
            status_code=400, detail="Không thể xóa vĩnh viễn Phòng placeholder"
        )

    # Delete any remaining user assignments to this sub-department

    db.query(UserSubDepartment).filter(
        UserSubDepartment.sub_department_id == sub_department_id
    ).delete()

    # Delete groups under this sub-department and their memberships to avoid FK violations
    group_ids = [
        gid
        for (gid,) in db.query(Group.id)
        .filter(Group.sub_department_id == sub_department_id)
        .all()
    ]
    if group_ids:
        db.query(UserGroup).filter(UserGroup.group_id.in_(group_ids)).delete(
            synchronize_session=False
        )
        db.query(Group).filter(Group.id.in_(group_ids)).delete(
            synchronize_session=False
        )

    db.delete(sub)
    db.commit()

    return {"message": "Phòng đã được xóa vĩnh viễn"}


@router.get("/{sub_department_id}")
def get_sub_department(sub_department_id: int, db: Session = Depends(get_db)):
    """Get a single sub_department by ID. Read-only for all."""
    sub = sub_department_repo.get_sub_department_by_id(db, sub_department_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-department not found")
    return _sub_to_dict(sub)


@router.post("", status_code=201)
def create_sub_department(
    request: SubDepartmentCreateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Create a new sub_department. Admin only."""
    dept = department_repo.get_department_by_id(db, request.department_id)
    if not dept:
        raise HTTPException(status_code=400, detail="Department not found")
    sub = SubDepartment(
        name=request.name,
        description=request.description,
        profile_img=request.profile_img,
        location=request.location,
        department_id=request.department_id,
        is_placeholder=False,
        deleted=False,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return _sub_to_dict(sub)


@router.put("/{sub_department_id}")
def update_sub_department(
    sub_department_id: int,
    request: SubDepartmentUpdateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Update a sub_department. Admin only. Cannot update placeholder."""
    sub = sub_department_repo.get_sub_department_by_id(db, sub_department_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-department not found")
    if sub.is_placeholder:
        raise HTTPException(
            status_code=400, detail="Cannot edit placeholder sub-department"
        )
    if request.name is not None:
        sub.name = request.name
    if request.description is not None:
        sub.description = request.description
    if request.profile_img is not None:
        sub.profile_img = request.profile_img
    if request.location is not None:
        sub.location = request.location
    if request.department_id is not None:
        dept = department_repo.get_department_by_id(db, request.department_id)
        if not dept:
            raise HTTPException(status_code=400, detail="Department not found")
        sub.department_id = request.department_id
    db.commit()
    db.refresh(sub)
    return _sub_to_dict(sub)


@router.delete("/{sub_department_id}")
def delete_sub_department(
    sub_department_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Xóa mềm một Phòng (sub-department). Gán lại người dùng sang Phòng 'Chưa phân công'. Chỉ quản trị viên."""
    sub = sub_department_repo.get_sub_department_by_id(db, sub_department_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-department not found")
    if sub.is_placeholder:
        raise HTTPException(
            status_code=400, detail="Cannot delete placeholder sub-department"
        )

    placeholder_sub = department_repo.get_placeholder_sub_department(db)
    if not placeholder_sub:
        raise HTTPException(
            status_code=500, detail="Placeholder sub-department not found"
        )

    # Reassign user assignments to placeholder sub-department
    for assignment in sub.user_assignments:
        assignment.sub_department_id = placeholder_sub.id
        assignment.position = None  # Clear position when moving to unassigned

    sub.deleted = True
    sub.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {
        "message": "Phòng đã xóa (mềm). Người dùng đã được chuyển sang 'Chưa phân công'."
    }
