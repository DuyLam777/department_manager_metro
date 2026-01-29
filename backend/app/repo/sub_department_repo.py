from sqlalchemy.orm import Session

from app.domain.sub_department import SubDepartment


def get_all_sub_departments(db: Session, include_deleted: bool = False) -> list[SubDepartment]:
    """Get all non-deleted sub_departments."""
    q = db.query(SubDepartment)
    if not include_deleted:
        q = q.filter(SubDepartment.deleted == False)
    return q.all()


def get_sub_departments_by_department_id(
    db: Session, department_id: int, include_deleted: bool = False
) -> list[SubDepartment]:
    """Get all sub_departments for a department."""
    q = db.query(SubDepartment).filter(SubDepartment.department_id == department_id)
    if not include_deleted:
        q = q.filter(SubDepartment.deleted == False)
    return q.all()


def get_deleted_sub_departments(db: Session) -> list[SubDepartment]:
    """Get all soft-deleted sub_departments (excluding placeholder)."""
    return (
        db.query(SubDepartment)
        .filter(SubDepartment.deleted == True, SubDepartment.is_placeholder == False)
        .order_by(SubDepartment.deleted_at.desc())
        .all()
    )
