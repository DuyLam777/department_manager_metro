from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.domain.sub_department import SubDepartment
from app.domain.user import User


def _user_query_options(q):
    """Apply common filter and eager-load options for user queries."""
    return q.filter(User.deleted == False).options(
        joinedload(User.department),
        joinedload(User.sub_department).joinedload(SubDepartment.department),
    )


def get_all_users(db: Session) -> list[User]:
    """Get all non-deleted users with department and sub_department loaded."""
    return _user_query_options(db.query(User)).all()


def get_users_filtered(
    db: Session,
    department_id: int | None = None,
    sub_department_id: int | None = None,
) -> list[User]:
    """Get users filtered by department (direct + in its sub-departments) or by sub_department. If both None, return all."""
    q = db.query(User)
    if sub_department_id is not None:
        q = q.filter(User.sub_department_id == sub_department_id)
    elif department_id is not None:
        # Users directly in this department OR in any sub_department of this department
        subq = db.query(SubDepartment.id).filter(
            SubDepartment.department_id == department_id,
            SubDepartment.deleted == False,
        )
        q = q.filter(
            or_(User.department_id == department_id, User.sub_department_id.in_(subq))
        )
    return _user_query_options(q).all()
