from sqlalchemy.orm import Session, joinedload

from app.domain.department import Department
from app.domain.sub_department import SubDepartment  # noqa: F401 - resolve relationship


def get_all_departments(db: Session, include_deleted: bool = False) -> list[Department]:
    """Get all non-deleted departments with users and sub_departments loaded."""
    q = (
        db.query(Department)
        .filter(Department.deleted == False)
        .options(
            joinedload(Department.users),
            joinedload(Department.sub_departments).joinedload(SubDepartment.users),
        )
    )
    return q.all()


def get_placeholder_department(db: Session) -> Department | None:
    """Get the placeholder department (for reassigning on delete)."""
    return db.query(Department).filter(Department.is_placeholder == True).first()


def get_department_by_id(db: Session, department_id: int, include_deleted: bool = False) -> Department | None:
    """Get a department by ID."""
    q = db.query(Department).filter(Department.id == department_id)
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