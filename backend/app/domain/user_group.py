from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.config.database import Base


class UserGroup(Base):
    """Association table for many-to-many relationship between users and groups."""

    __tablename__ = "user_groups"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="group_assignments")
    group = relationship("Group", back_populates="user_assignments")
