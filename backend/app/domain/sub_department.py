from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.config.database import Base


class SubDepartment(Base):
    __tablename__ = "sub_departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    profile_img = Column(String, nullable=True)
    location = Column(String, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    is_placeholder = Column(Boolean, default=False, nullable=False)
    deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship: sub_department belongs to one department
    department = relationship("Department", back_populates="sub_departments")

    # Many-to-many relationship with users through UserSubDepartment
    user_assignments = relationship(
        "UserSubDepartment",
        back_populates="sub_department",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # One-to-many relationship with groups
    groups = relationship("Group", back_populates="sub_department", lazy="selectin")

    @property
    def users(self):
        """Get all users assigned to this sub-department."""
        return [
            assignment.user for assignment in self.user_assignments if assignment.user
        ]
