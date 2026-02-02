from sqlalchemy import Column, Integer, String

from app.config.database import Base


class AppSettings(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, default=1)
    app_title = Column(String, nullable=False, default="Phần mềm quản lý nhân sự")
    header_banner_img = Column(String, nullable=True)
    app_logo_img = Column(String, nullable=True)
    main_bg_color = Column(String, nullable=False, default="#f3f4f6")
    sidebar_bg_color = Column(String, nullable=False, default="#1f2937")
