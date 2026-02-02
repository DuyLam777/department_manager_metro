import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import "./ImageCropModal.css";

/**
 * Creates a cropped image blob from the source image and pixel crop area.
 */
async function getCroppedImg(imageSrc, croppedAreaPixels) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
  });
}

function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (err) => reject(err));
    img.src = url;
  });
}

export function ImageCropModal({
  imageSrc,
  onCrop,
  onCancel,
  aspectRatio = 1,
  cropShape = "round",
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      await onCrop(blob);
    } catch {
      // parent handles errors
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="crop-modal-overlay" onClick={onCancel}>
      <div className="crop-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="crop-modal-header">
          <h3>Cắt ảnh</h3>
          <button type="button" className="crop-modal-close" onClick={onCancel}>
            &times;
          </button>
        </div>

        <div className="crop-container">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="crop-controls">
          <label className="crop-zoom-label">Phóng to</label>
          <input
            type="range"
            className="crop-zoom-slider"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </div>

        <div className="crop-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Hủy
          </button>
          <button
            type="button"
            className="btn-save"
            onClick={handleConfirm}
            disabled={processing}
          >
            {processing ? "Đang cắt..." : "Cắt & Tải lên"}
          </button>
        </div>
      </div>
    </div>
  );
}
