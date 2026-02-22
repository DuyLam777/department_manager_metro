from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.config.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=True)  # Only for admins
    email = Column(String, unique=True, index=True, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)  # Only for admins
    profile_img = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)
    deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Many-to-many relationship with sub-departments through UserSubDepartment
    # Each assignment has its own position
    sub_department_assignments = relationship(
        "UserSubDepartment",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # Many-to-many relationship with groups through UserGroup
    group_assignments = relationship(
        "UserGroup",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def sub_departments(self):
        """Get all sub-departments this user belongs to."""
        return [
            assignment.sub_department for assignment in self.sub_department_assignments
        ]

    @property
    def groups(self):
        """Get all non-deleted groups this user belongs to."""
        return [
            a.group for a in self.group_assignments if a.group and not a.group.deleted
        ]

    @property
    def departments(self):
        """Get all unique departments this user belongs to (through sub-departments)."""
        dept_ids_seen = set()
        depts = []
        for assignment in self.sub_department_assignments:
            if assignment.sub_department and assignment.sub_department.department:
                dept = assignment.sub_department.department
                if dept.id not in dept_ids_seen:
                    dept_ids_seen.add(dept.id)
                    depts.append(dept)
        return depts

    def get_position_in_sub_department(self, sub_department_id: int) -> str | None:
        """Get the user's position in a specific sub-department."""
        for assignment in self.sub_department_assignments:
            if assignment.sub_department_id == sub_department_id:
                return assignment.position
        return None
