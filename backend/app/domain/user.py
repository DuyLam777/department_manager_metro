from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
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
    position = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)
    deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Foreign key: user belongs to one department (direct) OR one sub_department
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    sub_department_id = Column(Integer, ForeignKey("sub_departments.id"), nullable=True)

    # Relationship: user belongs to one department (when assigned directly)
    department = relationship("Department", back_populates="users")
    # Relationship: user belongs to one sub_department (when assigned to sub)
    sub_department = relationship("SubDepartment", back_populates="users")
