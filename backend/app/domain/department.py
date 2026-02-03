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

    # Relationship: one department has many users (direct)
    users = relationship("User", back_populates="department")
    # Relationship: one department has many sub_departments
    sub_departments = relationship("SubDepartment", back_populates="department")
