from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.config.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    profile_img = Column(String, nullable=True)
    location = Column(String, nullable=True)
    is_placeholder = Column(Boolean, default=False, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship: one department has many sub_departments
    sub_departments = relationship("SubDepartment", back_populates="department")

    @property
    def users(self):
        """Get all unique users in this department (through sub-departments)."""
        user_ids_seen = set()
        users = []
        for sub in self.sub_departments:
            if not sub.deleted:
                for assignment in sub.user_assignments:
                    if assignment.user and not assignment.user.deleted:
                        if assignment.user.id not in user_ids_seen:
                            user_ids_seen.add(assignment.user.id)
                            users.append(assignment.user)
        return users
