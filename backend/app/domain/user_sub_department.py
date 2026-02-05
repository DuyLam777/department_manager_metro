from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.config.database import Base


class UserSubDepartment(Base):
    """Association table for many-to-many relationship between users and sub-departments.

    Each user can belong to multiple sub-departments, and each association has its own position.
    This allows a user to have different roles/positions in different sub-departments.
    """

    __tablename__ = "user_sub_departments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sub_department_id = Column(
        Integer, ForeignKey("sub_departments.id"), nullable=False, index=True
    )
    position = Column(
        String, nullable=True
    )  # Position specific to this sub-department assignment
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="sub_department_assignments")
    sub_department = relationship("SubDepartment", back_populates="user_assignments")
