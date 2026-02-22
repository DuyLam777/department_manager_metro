from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.config.database import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    sub_department_id = Column(
        Integer, ForeignKey("sub_departments.id"), nullable=False, index=True
    )
    deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship: group belongs to one sub-department
    sub_department = relationship("SubDepartment", back_populates="groups")

    # Relationship: group has many user assignments
    user_assignments = relationship(
        "UserGroup",
        back_populates="group",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def users(self):
        """Get all non-deleted users in this group."""
        return [a.user for a in self.user_assignments if a.user and not a.user.deleted]
