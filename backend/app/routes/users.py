import secrets
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.config.database import get_db
from app.domain.department import Department
from app.domain.sub_department import SubDepartment
from app.domain.user import User
from app.repo import user_repo
from app.service.auth_service import hash_password

router = APIRouter(prefix="/users", tags=["users"])


class UserCreateRequest(BaseModel):
    username: str
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    profile_img: str | None = None
    department_id: int | None = None
    sub_department_id: int | None = None


class UserUpdateRequest(BaseModel):
    username: str | None = None
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    profile_img: str | None = None
    department_id: int | None = None
    sub_department_id: int | None = None


def generate_random_password(length: int = 12) -> str:
    """Generate a random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _effective_department_name(u: User) -> str | None:
    """Department that owns the user: direct department or sub_department's department."""
    if u.sub_department and u.sub_department.department:
        return u.sub_department.department.name
    if u.department:
        return u.department.name
    return None


def user_to_dict(u: User, include_deleted_at: bool = False) -> dict:
    """Convert user model to response dict.

    Notes:
    - `department` label renamed to `bo_phan` (Bộ phận).
    - `effective_department` renamed to `effective_bo_phan`.
    - Include `position` (Chức vụ) in responses.
    """
    result = {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "profile_img": u.profile_img,
        "is_admin": u.is_admin,
        # Renamed: department -> bo_phan
        "bo_phan": u.department.name if u.department else None,
        "department_id": u.department_id,
        "sub_department": u.sub_department.name if u.sub_department else None,
        "sub_department_id": u.sub_department_id,
        # Renamed: effective_department -> effective_bo_phan
        "effective_bo_phan": _effective_department_name(u),
        # New: position (Chức vụ)
        "position": u.position,
    }
    if include_deleted_at:
        # Use an explicit None check to avoid relying on truthiness of SQLAlchemy Column values
        result["deleted_at"] = (
            u.deleted_at.isoformat() if u.deleted_at is not None else None
        )
    return result


@router.get("")
def list_users(
    department_id: int | None = Query(
        None, description="Filter by department (direct + its sub-departments)"
    ),
    sub_department_id: int | None = Query(None, description="Filter by sub-department"),
    db: Session = Depends(get_db),
):
    """Get users. Optional: filter by department_id or sub_department_id for lazy loading."""
    if sub_department_id is not None:
        users = user_repo.get_users_filtered(db, sub_department_id=sub_department_id)
    elif department_id is not None:
        users = user_repo.get_users_filtered(db, department_id=department_id)
    else:
        users = user_repo.get_all_users(db)
    return [user_to_dict(u) for u in users]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(request: UserCreateRequest, db: Session = Depends(get_db)):
    """Create a new user with a randomly generated password. Admin only."""
    # Check for duplicate username
    existing = db.query(User).filter(User.username == request.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Check for duplicate email
    if request.email:
        existing = db.query(User).filter(User.email == request.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")

    # User must have at most one of department_id or sub_department_id
    if request.department_id and request.sub_department_id:
        raise HTTPException(
            status_code=400,
            detail="User can have either a department or a sub-department, not both",
        )
    if request.department_id:
        dept = (
            db.query(Department)
            .filter(
                Department.id == request.department_id,
                Department.deleted == False,
            )
            .first()
        )
        if not dept:
            raise HTTPException(status_code=400, detail="Department not found")
    if request.sub_department_id:
        sub = (
            db.query(SubDepartment)
            .filter(
                SubDepartment.id == request.sub_department_id,
                SubDepartment.deleted == False,
            )
            .first()
        )
        if not sub:
            raise HTTPException(status_code=400, detail="Sub-department not found")

    # Generate random password
    plain_password = generate_random_password()

    # Create user (store only one of department_id or sub_department_id)
    user = User(
        username=request.username,
        email=request.email,
        first_name=request.first_name,
        last_name=request.last_name,
        profile_img=request.profile_img,
        password_hash=hash_password(plain_password),
        department_id=request.department_id if request.department_id else None,
        sub_department_id=request.sub_department_id
        if request.sub_department_id
        else None,
        is_admin=False,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Return user data with the generated password (shown once)
    return {
        **user_to_dict(user),
        "generated_password": plain_password,
    }


@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a single user by ID."""
    user = (
        db.query(User)
        .filter(User.id == user_id, User.deleted == False)
        .options(
            joinedload(User.department),
            joinedload(User.sub_department).joinedload(SubDepartment.department),
        )
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user_to_dict(user)


@router.put("/{user_id}")
def update_user(
    user_id: int, request: UserUpdateRequest, db: Session = Depends(get_db)
):
    """Update a user's information. Admin only (enforced by frontend for now)."""
    user = (
        db.query(User)
        .filter(User.id == user_id, User.deleted == False)
        .options(
            joinedload(User.department),
            joinedload(User.sub_department).joinedload(SubDepartment.department),
        )
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update fields if provided
    if request.username is not None:
        # Check for duplicate username
        existing = (
            db.query(User)
            .filter(User.username == request.username, User.id != user_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = request.username

    if request.email is not None:
        # Check for duplicate email
        if request.email:
            existing = (
                db.query(User)
                .filter(User.email == request.email, User.id != user_id)
                .first()
            )
            if existing:
                raise HTTPException(status_code=400, detail="Email already taken")
        user.email = request.email

    if request.first_name is not None:
        user.first_name = request.first_name

    if request.last_name is not None:
        user.last_name = request.last_name

    if request.profile_img is not None:
        user.profile_img = request.profile_img

    if request.department_id is not None or request.sub_department_id is not None:
        # Resolve: user can have only one of department or sub_department
        new_dept_id = request.department_id
        new_sub_id = request.sub_department_id
        if new_dept_id and new_sub_id:
            raise HTTPException(
                status_code=400,
                detail="User can have either a department or a sub-department, not both",
            )
        if new_dept_id:
            dept = (
                db.query(Department)
                .filter(
                    Department.id == new_dept_id,
                    Department.deleted == False,
                )
                .first()
            )
            if not dept:
                raise HTTPException(status_code=400, detail="Department not found")
            user.department_id = new_dept_id
            user.sub_department_id = None
        elif new_sub_id is not None:
            sub = (
                db.query(SubDepartment)
                .filter(
                    SubDepartment.id == new_sub_id,
                    SubDepartment.deleted == False,
                )
                .first()
            )
            if not sub:
                raise HTTPException(status_code=400, detail="Sub-department not found")
            user.sub_department_id = new_sub_id
            user.department_id = None
        else:
            user.department_id = None
            user.sub_department_id = None

    db.commit()
    db.refresh(user)

    return user_to_dict(user)


@router.post("/{user_id}/reset-password")
def reset_user_password(user_id: int, db: Session = Depends(get_db)):
    """Reset a user's password and generate a new one. Admin only."""
    user = db.query(User).filter(User.id == user_id, User.deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate new random password
    new_password = generate_random_password()
    user.password_hash = hash_password(new_password)

    db.commit()

    return {
        "message": "Password reset successfully",
        "new_password": new_password,
    }


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Soft-delete a user. Admin only."""
    user = db.query(User).filter(User.id == user_id, User.deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deleting admin users
    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot delete admin users")

    # Soft delete with timestamp
    user.deleted = True
    user.deleted_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "User deleted successfully"}


@router.get("/deleted/list")
def list_deleted_users(db: Session = Depends(get_db)):
    """Get all soft-deleted users. Admin only."""
    users = (
        db.query(User)
        .filter(User.deleted == True)
        .order_by(User.deleted_at.desc())
        .all()
    )
    return [user_to_dict(u, include_deleted_at=True) for u in users]


@router.post("/{user_id}/restore")
def restore_user(user_id: int, db: Session = Depends(get_db)):
    """Restore a soft-deleted user. Admin only."""
    user = db.query(User).filter(User.id == user_id, User.deleted == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="Deleted user not found")

    # Restore user
    user.deleted = False
    user.deleted_at = None
    db.commit()

    return {"message": "User restored successfully", "user": user_to_dict(user)}


@router.delete("/{user_id}/permanent")
def permanent_delete_user(user_id: int, db: Session = Depends(get_db)):
    """Permanently delete a soft-deleted user. Admin only."""
    user = db.query(User).filter(User.id == user_id, User.deleted == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="Deleted user not found")

    db.delete(user)
    db.commit()

    return {"message": "User permanently deleted"}


@router.delete("/deleted/cleanup")
def cleanup_deleted_users(days: int = 30, db: Session = Depends(get_db)):
    """Permanently delete users that were soft-deleted more than X days ago. Admin only."""
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

    old_deleted_users = (
        db.query(User)
        .filter(
            User.deleted == True, User.deleted_at != None, User.deleted_at < cutoff_date
        )
        .all()
    )

    count = len(old_deleted_users)

    for user in old_deleted_users:
        db.delete(user)

    db.commit()

    return {"message": f"Permanently deleted {count} users older than {days} days"}
