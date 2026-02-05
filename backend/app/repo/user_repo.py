from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.domain.sub_department import SubDepartment
from app.domain.user import User
from app.domain.user_sub_department import UserSubDepartment


def _user_query_options(q):
    """Apply common filter and eager-load options for user queries."""
    return q.filter(User.deleted == False).options(
        selectinload(User.sub_department_assignments)
        .joinedload(UserSubDepartment.sub_department)
        .joinedload(SubDepartment.department),
    )


def get_all_users(db: Session) -> list[User]:
    """Get all non-deleted users with sub_department assignments loaded."""
    return _user_query_options(db.query(User)).all()


def get_users_filtered(
    db: Session,
    department_id: int | None = None,
    sub_department_id: int | None = None,
) -> list[User]:
    """Get users filtered by department (users in any of its sub-departments) or by sub_department.

    If both None, return all users.
    """
    q = db.query(User)

    if sub_department_id is not None:
        # Users who have an assignment to this sub-department
        q = q.join(UserSubDepartment).filter(
            UserSubDepartment.sub_department_id == sub_department_id
        )
    elif department_id is not None:
        # Users who have an assignment to any sub-department of this department
        subq = db.query(SubDepartment.id).filter(
            SubDepartment.department_id == department_id,
            SubDepartment.deleted == False,
        )
        q = q.join(UserSubDepartment).filter(
            UserSubDepartment.sub_department_id.in_(subq)
        )

    # Apply standard filters and eager loading, then deduplicate
    users = _user_query_options(q).all()

    # Deduplicate in case a user appears multiple times due to multiple assignments
    seen_ids = set()
    unique_users = []
    for user in users:
        if user.id not in seen_ids:
            seen_ids.add(user.id)
            unique_users.append(user)

    return unique_users


def get_user_by_id(db: Session, user_id: int) -> User | None:
    """Get a single user by ID with all relationships loaded."""
    return _user_query_options(db.query(User).filter(User.id == user_id)).first()


def get_users_in_sub_department(db: Session, sub_department_id: int) -> list[User]:
    """Get all users assigned to a specific sub-department."""
    return (
        db.query(User)
        .join(UserSubDepartment)
        .filter(
            UserSubDepartment.sub_department_id == sub_department_id,
            User.deleted == False,
        )
        .options(
            selectinload(User.sub_department_assignments)
            .joinedload(UserSubDepartment.sub_department)
            .joinedload(SubDepartment.department),
        )
        .all()
    )
