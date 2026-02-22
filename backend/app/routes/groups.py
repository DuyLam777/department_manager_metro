from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.domain.group import Group
from app.domain.sub_department import SubDepartment
from app.domain.user import User
from app.domain.user_group import UserGroup
from app.repo import group_repo
from app.routes.auth import require_admin

router = APIRouter(prefix="/groups", tags=["groups"])


class GroupCreateRequest(BaseModel):
    name: str
    description: str | None = None
    sub_department_id: int


class GroupUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    sub_department_id: int | None = None


class MemberAddRequest(BaseModel):
    user_ids: list[int]


class MemberReplaceRequest(BaseModel):
    user_ids: list[int]


def _group_to_dict(group: Group, include_members: bool = False) -> dict:
    sub_dept = group.sub_department
    dept = sub_dept.department if sub_dept else None
    result = {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "sub_department_id": group.sub_department_id,
        "sub_department_name": sub_dept.name if sub_dept else None,
        "department_id": dept.id if dept else None,
        "department_name": dept.name if dept else None,
        "user_count": sum(
            1 for a in group.user_assignments if a.user and not a.user.deleted
        ),
    }
    if include_members:
        members = []
        for a in group.user_assignments:
            u = a.user
            if u and not u.deleted:
                members.append(
                    {
                        "id": u.id,
                        "email": u.email,
                        "first_name": u.first_name,
                        "last_name": u.last_name,
                        "profile_img": u.profile_img,
                        "is_admin": u.is_admin,
                    }
                )
        result["members"] = members
    return result


# ---------------------------------------------------------------------------
# READ endpoints (public)
# ---------------------------------------------------------------------------


@router.get("")
def list_groups(
    sub_department_id: int | None = Query(None, description="Filter by sub-department"),
    db: Session = Depends(get_db),
):
    """List all non-deleted groups. Optionally filter by sub_department_id."""
    if sub_department_id is not None:
        gs = group_repo.get_groups_by_sub_department_id(db, sub_department_id)
    else:
        gs = group_repo.get_all_groups(db)
    return [_group_to_dict(g) for g in gs]


@router.get("/deleted/list")
def list_deleted_groups(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """List all soft-deleted groups. Admin only."""
    gs = group_repo.get_deleted_groups(db)
    return [
        {
            **_group_to_dict(g),
            "deleted_at": g.deleted_at.isoformat() if g.deleted_at else None,
        }
        for g in gs
    ]


@router.get("/{group_id}")
def get_group(group_id: int, db: Session = Depends(get_db)):
    """Get a single group by ID, including its members."""
    g = group_repo.get_group_by_id(db, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    return _group_to_dict(g, include_members=True)


@router.get("/{group_id}/members")
def list_group_members(group_id: int, db: Session = Depends(get_db)):
    """List all members of a group."""
    g = group_repo.get_group_by_id(db, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    return [
        {
            "id": a.user.id,
            "email": a.user.email,
            "first_name": a.user.first_name,
            "last_name": a.user.last_name,
            "profile_img": a.user.profile_img,
            "is_admin": a.user.is_admin,
        }
        for a in g.user_assignments
        if a.user and not a.user.deleted
    ]


# ---------------------------------------------------------------------------
# WRITE endpoints (admin only)
# ---------------------------------------------------------------------------


@router.post("", status_code=201)
def create_group(
    request: GroupCreateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Create a new group. Admin only. Cannot create in a placeholder sub-department."""
    sub = (
        db.query(SubDepartment)
        .filter(
            SubDepartment.id == request.sub_department_id,
            SubDepartment.deleted == False,  # noqa: E712
        )
        .first()
    )
    if not sub:
        raise HTTPException(status_code=400, detail="Sub-department not found")
    if sub.is_placeholder:
        raise HTTPException(
            status_code=400,
            detail="Cannot create a group in a placeholder sub-department",
        )
    g = Group(
        name=request.name,
        description=request.description,
        sub_department_id=request.sub_department_id,
        deleted=False,
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    g = group_repo.get_group_by_id(db, g.id)
    return _group_to_dict(g)


@router.put("/{group_id}")
def update_group(
    group_id: int,
    request: GroupUpdateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Update a group. Admin only."""
    g = group_repo.get_group_by_id(db, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    if request.name is not None:
        g.name = request.name
    if request.description is not None:
        g.description = request.description
    if request.sub_department_id is not None:
        sub = (
            db.query(SubDepartment)
            .filter(
                SubDepartment.id == request.sub_department_id,
                SubDepartment.deleted == False,  # noqa: E712
            )
            .first()
        )
        if not sub:
            raise HTTPException(status_code=400, detail="Sub-department not found")
        if sub.is_placeholder:
            raise HTTPException(
                status_code=400,
                detail="Cannot move a group into a placeholder sub-department",
            )
        g.sub_department_id = request.sub_department_id
    db.commit()
    db.refresh(g)
    g = group_repo.get_group_by_id(db, group_id)
    return _group_to_dict(g)


@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Soft-delete a group. Admin only."""
    g = group_repo.get_group_by_id(db, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    g.deleted = True
    g.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Group deleted (soft)"}


@router.post("/{group_id}/restore")
def restore_group(
    group_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Restore a soft-deleted group. Admin only."""
    g = group_repo.get_group_by_id(db, group_id, include_deleted=True)
    if not g or not g.deleted:
        raise HTTPException(status_code=404, detail="Deleted group not found")
    sub = (
        db.query(SubDepartment)
        .filter(
            SubDepartment.id == g.sub_department_id,
            SubDepartment.deleted == False,  # noqa: E712
        )
        .first()
    )
    if not sub:
        raise HTTPException(
            status_code=400,
            detail="The sub-department this group belongs to no longer exists",
        )
    if sub.is_placeholder:
        raise HTTPException(
            status_code=400,
            detail="Cannot restore a group into a placeholder sub-department",
        )
    g.deleted = False
    g.deleted_at = None
    db.commit()
    g = group_repo.get_group_by_id(db, group_id)
    return {"message": "Group restored", "group": _group_to_dict(g)}


@router.delete("/{group_id}/permanent")
def permanent_delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Permanently delete a soft-deleted group. Admin only."""
    g = group_repo.get_group_by_id(db, group_id, include_deleted=True)
    if not g or not g.deleted:
        raise HTTPException(status_code=404, detail="Deleted group not found")
    db.query(UserGroup).filter(UserGroup.group_id == group_id).delete()
    db.delete(g)
    db.commit()
    return {"message": "Group permanently deleted"}


# ---------------------------------------------------------------------------
# Member management (admin only)
# ---------------------------------------------------------------------------


@router.post("/{group_id}/members")
def add_group_members(
    group_id: int,
    request: MemberAddRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Add users to a group, skipping duplicates. Admin only."""
    g = group_repo.get_group_by_id(db, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    existing = {a.user_id for a in g.user_assignments}
    added = 0
    for uid in request.user_ids:
        if uid in existing:
            continue
        u = db.query(User).filter(User.id == uid, User.deleted == False).first()  # noqa: E712
        if not u:
            raise HTTPException(status_code=400, detail=f"User {uid} not found")
        db.add(UserGroup(user_id=uid, group_id=group_id))
        existing.add(uid)
        added += 1
    db.commit()
    g = group_repo.get_group_by_id(db, group_id)
    return {"message": f"Added {added} member(s)", "group": _group_to_dict(g, include_members=True)}


@router.delete("/{group_id}/members/{user_id}")
def remove_group_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Remove a single user from a group. Admin only."""
    g = group_repo.get_group_by_id(db, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    a = (
        db.query(UserGroup)
        .filter(UserGroup.group_id == group_id, UserGroup.user_id == user_id)
        .first()
    )
    if not a:
        raise HTTPException(status_code=404, detail="User is not a member of this group")
    db.delete(a)
    db.commit()
    return {"message": "Member removed"}


@router.put("/{group_id}/members")
def replace_group_members(
    group_id: int,
    request: MemberReplaceRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Replace the full member list of a group. Admin only."""
    g = group_repo.get_group_by_id(db, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    for uid in request.user_ids:
        u = db.query(User).filter(User.id == uid, User.deleted == False).first()  # noqa: E712
        if not u:
            raise HTTPException(status_code=400, detail=f"User {uid} not found")
    db.query(UserGroup).filter(UserGroup.group_id == group_id).delete()
    seen: set[int] = set()
    for uid in request.user_ids:
        if uid not in seen:
            db.add(UserGroup(user_id=uid, group_id=group_id))
            seen.add(uid)
    db.commit()
    g = group_repo.get_group_by_id(db, group_id)
    return _group_to_dict(g, include_members=True)
