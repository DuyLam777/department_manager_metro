from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.domain.app_settings import AppSettings
from app.routes.auth import require_admin

router = APIRouter(prefix="/settings", tags=["settings"])

DEFAULTS = {
    "app_title": "Phần mềm quản lý nhân sự",
    "header_banner_img": None,
    "app_logo_img": None,
    "main_bg_color": "#f3f4f6",
    "sidebar_bg_color": "#1f2937",
}


class SettingsUpdateRequest(BaseModel):
    app_title: str | None = None
    header_banner_img: str | None = None
    app_logo_img: str | None = None
    main_bg_color: str | None = None
    sidebar_bg_color: str | None = None


def _get_or_create(db: Session) -> AppSettings:
    """Get the singleton settings row, creating it with defaults if missing."""
    row = db.query(AppSettings).filter(AppSettings.id == 1).first()
    if not row:
        row = AppSettings(id=1, **DEFAULTS)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def _to_dict(row: AppSettings) -> dict:
    return {
        "app_title": row.app_title,
        "header_banner_img": row.header_banner_img,
        "app_logo_img": row.app_logo_img,
        "main_bg_color": row.main_bg_color,
        "sidebar_bg_color": row.sidebar_bg_color,
    }


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    """Get app settings. Public (all users see the same config)."""
    return _to_dict(_get_or_create(db))


@router.put("")
def update_settings(
    request: SettingsUpdateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Update app settings. Admin only."""
    row = _get_or_create(db)
    if request.app_title is not None:
        row.app_title = request.app_title
    if request.header_banner_img is not None:
        row.header_banner_img = request.header_banner_img or None
    if request.app_logo_img is not None:
        row.app_logo_img = request.app_logo_img or None
    if request.main_bg_color is not None:
        row.main_bg_color = request.main_bg_color
    if request.sidebar_bg_color is not None:
        row.sidebar_bg_color = request.sidebar_bg_color
    db.commit()
    db.refresh(row)
    return _to_dict(row)
