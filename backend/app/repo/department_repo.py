from sqlalchemy.orm import Session

from app.domain.department import Department


def get_all_departments(db: Session) -> list[Department]:
    """Get all departments."""
    return db.query(Department).all()
