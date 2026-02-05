from sqlalchemy.orm import Session, joinedload, selectinload

from app.domain.department import Department
from app.domain.sub_department import SubDepartment
from app.domain.user_sub_department import UserSubDepartment


def get_all_departments(db: Session, include_deleted: bool = False) -> list[Department]:
    """Get all non-deleted departments with sub_departments and user assignments loaded.

    Orders by: is_placeholder ASC (non-placeholder first), then display_order ASC.
    This ensures 'Chưa phân công' is always last.
    """
    q = (
        db.query(Department)
        .filter(Department.deleted == False)
        .options(
            selectinload(Department.sub_departments)
            .selectinload(SubDepartment.user_assignments)
            .joinedload(UserSubDepartment.user),
        )
        .order_by(Department.is_placeholder.asc(), Department.display_order.asc())
    )
    return q.all()


def get_placeholder_department(db: Session) -> Department | None:
    """Get the placeholder department (for reassigning on delete)."""
    return db.query(Department).filter(Department.is_placeholder == True).first()


def get_placeholder_sub_department(db: Session) -> SubDepartment | None:
    """Get the placeholder sub-department (for reassigning on delete)."""
    return db.query(SubDepartment).filter(SubDepartment.is_placeholder == True).first()


def get_department_by_id(
    db: Session, department_id: int, include_deleted: bool = False
) -> Department | None:
    """Get a department by ID with sub_departments and user assignments loaded."""
    q = (
        db.query(Department)
        .filter(Department.id == department_id)
        .options(
            selectinload(Department.sub_departments)
            .selectinload(SubDepartment.user_assignments)
            .joinedload(UserSubDepartment.user),
        )
    )
    if not include_deleted:
        q = q.filter(Department.deleted == False)
    return q.first()


def get_deleted_departments(db: Session) -> list[Department]:
    """Get all soft-deleted departments (excluding placeholder)."""
    return (
        db.query(Department)
        .filter(Department.deleted == True, Department.is_placeholder == False)
        .order_by(Department.deleted_at.desc())
        .all()
    )
