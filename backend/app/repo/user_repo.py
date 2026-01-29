from sqlalchemy.orm import Session

from app.domain.user import User


def get_all_users(db: Session) -> list[User]:
    """Get all non-deleted users."""
    return db.query(User).filter(User.deleted == False).all()
