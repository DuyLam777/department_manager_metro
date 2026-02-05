from sqlalchemy.orm import Session, joinedload, selectinload

from app.domain.sub_department import SubDepartment
from app.domain.user_sub_department import UserSubDepartment


def get_all_sub_departments(
    db: Session, include_deleted: bool = False
) -> list[SubDepartment]:
    """Get all non-deleted sub_departments with user assignments loaded."""
    q = db.query(SubDepartment).options(
        selectinload(SubDepartment.user_assignments).joinedload(UserSubDepartment.user),
        joinedload(SubDepartment.department),
    )
    if not include_deleted:
        q = q.filter(SubDepartment.deleted == False)
    return q.all()


def get_sub_departments_by_department_id(
    db: Session, department_id: int, include_deleted: bool = False
) -> list[SubDepartment]:
    """Get all sub_departments for a department with user assignments loaded."""
    q = (
        db.query(SubDepartment)
        .filter(SubDepartment.department_id == department_id)
        .options(
            selectinload(SubDepartment.user_assignments).joinedload(
                UserSubDepartment.user
            ),
            joinedload(SubDepartment.department),
        )
    )
    if not include_deleted:
        q = q.filter(SubDepartment.deleted == False)
    return q.all()


def get_sub_department_by_id(
    db: Session, sub_department_id: int, include_deleted: bool = False
) -> SubDepartment | None:
    """Get a sub_department by ID with user assignments loaded."""
    q = (
        db.query(SubDepartment)
        .filter(SubDepartment.id == sub_department_id)
        .options(
            selectinload(SubDepartment.user_assignments).joinedload(
                UserSubDepartment.user
            ),
            joinedload(SubDepartment.department),
        )
    )
    if not include_deleted:
        q = q.filter(SubDepartment.deleted == False)
    return q.first()


def get_deleted_sub_departments(db: Session) -> list[SubDepartment]:
    """Get all soft-deleted sub_departments (excluding placeholder)."""
    return (
        db.query(SubDepartment)
        .filter(SubDepartment.deleted == True, SubDepartment.is_placeholder == False)
        .options(joinedload(SubDepartment.department))
        .order_by(SubDepartment.deleted_at.desc())
        .all()
    )
