import secrets
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.domain.sub_department import SubDepartment
from app.domain.user import User
from app.domain.user_sub_department import UserSubDepartment
from app.repo import department_repo, user_repo
from app.service.auth_service import hash_password

router = APIRouter(prefix="/users", tags=["users"])


class SubDepartmentAssignment(BaseModel):
    sub_department_id: int
    position: str | None = None


class UserCreateRequest(BaseModel):
    username: str | None = None  # Only required for admins
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    profile_img: str | None = None
    # List of sub-department assignments with positions
    sub_department_assignments: list[SubDepartmentAssignment] = []
    is_admin: bool = False  # Whether to create as admin


class UserUpdateRequest(BaseModel):
    username: str | None = None
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    profile_img: str | None = None
    # List of sub-department assignments with positions (replaces all existing)
    sub_department_assignments: list[SubDepartmentAssignment] | None = None


def generate_random_password(length: int = 12) -> str:
    """Generate a random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def user_to_dict(u: User, include_deleted_at: bool = False) -> dict:
    """Convert user model to response dict.

    The response includes:
    - Basic user info (id, username, email, name, etc.)
    - sub_department_assignments: list of {sub_department_id, sub_department_name,
      department_id, department_name, position}
    - For backwards compatibility, also includes primary assignment info
    """
    # Get all sub-department assignments
    assignments = []
    primary_dept_name = None
    primary_sub_dept_name = None
    primary_sub_dept_id = None
    primary_dept_id = None
    primary_position = None

    for assignment in u.sub_department_assignments:
        sub_dept = assignment.sub_department
        if sub_dept and not sub_dept.deleted:
            dept = sub_dept.department
            dept_name = dept.name if dept and not dept.deleted else None
            dept_id = dept.id if dept and not dept.deleted else None

            assignment_dict = {
                "sub_department_id": sub_dept.id,
                "sub_department_name": sub_dept.name,
                "department_id": dept_id,
                "department_name": dept_name,
                "position": assignment.position,
                "is_placeholder": sub_dept.is_placeholder,
            }
            assignments.append(assignment_dict)

            # Use first non-placeholder assignment as primary
            if primary_dept_name is None and not sub_dept.is_placeholder:
                primary_dept_name = dept_name
                primary_dept_id = dept_id
                primary_sub_dept_name = sub_dept.name
                primary_sub_dept_id = sub_dept.id
                primary_position = assignment.position

    result = {
        "id": u.id,
        "username": u.username if u.is_admin else None,  # Only admins have username
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "profile_img": u.profile_img,
        "is_admin": u.is_admin,
        # All sub-department assignments with positions
        "sub_department_assignments": assignments,
        # Primary/first assignment for backwards compatibility
        "bo_phan": primary_dept_name,
        "department_id": primary_dept_id,
        "sub_department": primary_sub_dept_name,
        "sub_department_id": primary_sub_dept_id,
        "effective_bo_phan": primary_dept_name,
        "position": primary_position,
    }
    if include_deleted_at:
        result["deleted_at"] = (
            u.deleted_at.isoformat() if u.deleted_at is not None else None
        )
    return result


@router.get("")
def list_users(
    department_id: int | None = Query(
        None, description="Filter by department (users in its sub-departments)"
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
    """Create a new user. Admin users get username/password, regular users don't."""
    # Admin users require username
    if request.is_admin:
        if not request.username:
            raise HTTPException(
                status_code=400, detail="Username is required for admin users"
            )
        # Check for duplicate username
        existing = db.query(User).filter(User.username == request.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

    # Check for duplicate email
    if request.email:
        existing = db.query(User).filter(User.email == request.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")

    # Validate sub-department IDs
    for assignment in request.sub_department_assignments:
        sub = (
            db.query(SubDepartment)
            .filter(
                SubDepartment.id == assignment.sub_department_id,
                SubDepartment.deleted == False,
            )
            .first()
        )
        if not sub:
            raise HTTPException(
                status_code=400,
                detail=f"Sub-department {assignment.sub_department_id} not found",
            )

    # Only generate password for admin users
    plain_password = None
    password_hash = None
    if request.is_admin:
        plain_password = generate_random_password()
        password_hash = hash_password(plain_password)

    # Create user
    user = User(
        username=request.username if request.is_admin else None,
        email=request.email,
        first_name=request.first_name,
        last_name=request.last_name,
        profile_img=request.profile_img,
        password_hash=password_hash,
        is_admin=request.is_admin,
    )

    db.add(user)
    db.flush()  # Get user ID

    # Create sub-department assignments
    for assignment in request.sub_department_assignments:
        user_sub_dept = UserSubDepartment(
            user_id=user.id,
            sub_department_id=assignment.sub_department_id,
            position=assignment.position,
        )
        db.add(user_sub_dept)

    db.commit()
    db.refresh(user)

    # Return user data with the generated password (shown once) for admin users
    result = user_to_dict(user)
    if request.is_admin and plain_password:
        result["generated_password"] = plain_password
    return result


@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a single user by ID."""
    user = user_repo.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user_to_dict(user)


@router.put("/{user_id}")
def update_user(
    user_id: int, request: UserUpdateRequest, db: Session = Depends(get_db)
):
    """Update a user's information. Admin only (enforced by frontend for now)."""
    user = user_repo.get_user_by_id(db, user_id)
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

    # Update sub-department assignments if provided
    if request.sub_department_assignments is not None:
        # Validate new sub-department IDs
        for assignment in request.sub_department_assignments:
            sub = (
                db.query(SubDepartment)
                .filter(
                    SubDepartment.id == assignment.sub_department_id,
                    SubDepartment.deleted == False,
                )
                .first()
            )
            if not sub:
                raise HTTPException(
                    status_code=400,
                    detail=f"Sub-department {assignment.sub_department_id} not found",
                )

        # Delete existing assignments
        db.query(UserSubDepartment).filter(
            UserSubDepartment.user_id == user_id
        ).delete()

        # Create new assignments
        for assignment in request.sub_department_assignments:
            user_sub_dept = UserSubDepartment(
                user_id=user_id,
                sub_department_id=assignment.sub_department_id,
                position=assignment.position,
            )
            db.add(user_sub_dept)

    db.commit()
    db.refresh(user)

    return user_to_dict(user)


class SetPasswordRequest(BaseModel):
    password: str


@router.post("/{user_id}/reset-password")
def reset_user_password(user_id: int, db: Session = Depends(get_db)):
    """Reset an admin user's password and generate a new one. Only works for admin users."""
    user = db.query(User).filter(User.id == user_id, User.deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only admin users have passwords
    if not user.is_admin:
        raise HTTPException(
            status_code=400, detail="Only admin users have passwords to reset"
        )

    # Generate new random password
    new_password = generate_random_password()
    user.password_hash = hash_password(new_password)

    db.commit()

    return {
        "message": "Password reset successfully",
        "new_password": new_password,
    }


@router.post("/{user_id}/set-password")
def set_user_password(
    user_id: int, request: SetPasswordRequest, db: Session = Depends(get_db)
):
    """Set a custom password for an admin user. Only works for admin users."""
    user = db.query(User).filter(User.id == user_id, User.deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only admin users have passwords
    if not user.is_admin:
        raise HTTPException(status_code=400, detail="Only admin users have passwords")

    # Validate password length
    if len(request.password) < 6:
        raise HTTPException(
            status_code=400, detail="Password must be at least 6 characters"
        )

    user.password_hash = hash_password(request.password)
    db.commit()

    return {"message": "Password set successfully"}


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

    # Delete sub-department assignments first
    db.query(UserSubDepartment).filter(UserSubDepartment.user_id == user_id).delete()

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
        # Delete sub-department assignments first
        db.query(UserSubDepartment).filter(
            UserSubDepartment.user_id == user.id
        ).delete()
        db.delete(user)

    db.commit()

    return {"message": f"Permanently deleted {count} users older than {days} days"}
