import os
import uuid
from mimetypes import guess_type
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

router = APIRouter(tags=["uploads"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "uploads"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload a profile image. Returns the URL path to the uploaded file."""
    # Validate content type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Validate extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Allowed file types: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size must be under 5 MB")

    # Save with unique name
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_name
    file_path.write_bytes(contents)

    # Return proxied URL so the frontend requests go through /api/ and the nginx proxy
    # can forward them to this backend (e.g. /api/uploads/... -> backend /uploads/...)
    return {"url": f"/api/uploads/{unique_name}"}


@router.get("/uploads/{filename}")
async def serve_upload(filename: str):
    """Serve an uploaded file."""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    # Prevent directory traversal
    if file_path.resolve().parent != UPLOAD_DIR.resolve():
        raise HTTPException(status_code=404, detail="File not found")
    media_type, _ = guess_type(str(file_path))
    return FileResponse(file_path, media_type=media_type or "application/octet-stream")
