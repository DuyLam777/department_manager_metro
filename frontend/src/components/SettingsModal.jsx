import { useState } from "react";
import { ImageCropModal } from "./ImageCropModal";
import "./SettingsModal.css";

export function SettingsModal({
  settings,
  token,
  isAdmin,
  onSave,
  onClose,
  onDeletedItemsClick,
}) {
  const [appTitle, setAppTitle] = useState(settings.app_title || "");
  const [headerBannerImg, setHeaderBannerImg] = useState(
    settings.header_banner_img || "",
  );
  const [appLogoImg, setAppLogoImg] = useState(settings.app_logo_img || "");
  const [mainBgColor, setMainBgColor] = useState(
    settings.main_bg_color || "#f3f4f6",
  );
  const [sidebarBgColor, setSidebarBgColor] = useState(
    settings.sidebar_bg_color || "#1f2937",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [cropTarget, setCropTarget] = useState("banner");

  const hasChanges = () => {
    return (
      appTitle !== (settings.app_title || "") ||
      headerBannerImg !== (settings.header_banner_img || "") ||
      appLogoImg !== (settings.app_logo_img || "") ||
      mainBgColor !== (settings.main_bg_color || "#f3f4f6") ||
      sidebarBgColor !== (settings.sidebar_bg_color || "#1f2937")
    );
  };

  const handleClose = () => {
    if (hasChanges()) {
      if (confirm("Bạn có thay đổi chưa lưu. Bỏ chúng?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          app_title: appTitle,
          header_banner_img: headerBannerImg || "",
          app_logo_img: appLogoImg || "",
          main_bg_color: mainBgColor,
          sidebar_bg_color: sidebarBgColor,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Lưu cài đặt thất bại");
      }
      const updated = await res.json();
      onSave(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBannerFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropTarget("banner");
      setCropImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleLogoFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropTarget("logo");
      setCropImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleImageCrop = async (blob) => {
    const filename = cropTarget === "logo" ? "logo.png" : "banner.jpg";
    const formData = new FormData();
    formData.append("file", blob, filename);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Tải lên thất bại");
      }
      const { url } = await res.json();
      if (cropTarget === "logo") {
        setAppLogoImg(url);
      } else {
        setHeaderBannerImg(url);
      }
    } catch (err) {
      setError(err.message);
    }
    setCropImageSrc(null);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-modal-header">
          <h2>Cài đặt</h2>
          <button
            type="button"
            className="settings-close-btn"
            onClick={handleClose}
          >
            &times;
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="settings-section">
          <label className="settings-label">Tiêu đề ứng dụng</label>
          <input
            type="text"
            className="settings-input"
            value={appTitle}
            onChange={(e) => setAppTitle(e.target.value)}
          />
        </div>

        <div className="settings-section">
          <label className="settings-label">Logo ứng dụng</label>
          {appLogoImg && (
            <div className="settings-logo-preview">
              <img src={appLogoImg} alt="Logo preview" />
            </div>
          )}
          <div className="settings-banner-actions">
            <label className="btn-upload-img">
              {appLogoImg ? "Thay đổi" : "Tải lên"}
              <input
                type="file"
                accept="image/*"
                className="profile-upload-input"
                onChange={handleLogoFileSelect}
              />
            </label>
            {appLogoImg && (
              <button
                type="button"
                className="btn-remove-img"
                onClick={() => setAppLogoImg("")}
              >
                Xóa
              </button>
            )}
          </div>
        </div>

        <div className="settings-section">
          <label className="settings-label">Ảnh biểu ngữ đầu trang</label>
          {headerBannerImg && (
            <div className="settings-banner-preview">
              <img src={headerBannerImg} alt="Banner preview" />
            </div>
          )}
          <div className="settings-banner-actions">
            <label className="btn-upload-img">
              {headerBannerImg ? "Thay đổi" : "Tải lên"}
              <input
                type="file"
                accept="image/*"
                className="profile-upload-input"
                onChange={handleBannerFileSelect}
              />
            </label>
            {headerBannerImg && (
              <button
                type="button"
                className="btn-remove-img"
                onClick={() => setHeaderBannerImg("")}
              >
                Xóa
              </button>
            )}
          </div>
        </div>

        <div className="settings-section">
          <label className="settings-label">Màu nền chính</label>
          <div className="settings-color-row">
            <input
              type="color"
              className="settings-color-input"
              value={mainBgColor}
              onChange={(e) => setMainBgColor(e.target.value)}
            />
            <input
              type="text"
              className="settings-color-hex"
              value={mainBgColor}
              onChange={(e) => setMainBgColor(e.target.value)}
            />
            <button
              type="button"
              className="btn-reset-color"
              onClick={() => setMainBgColor("#f3f4f6")}
            >
              Đặt lại
            </button>
          </div>
        </div>

        <div className="settings-section">
          <label className="settings-label">Màu nền thanh bên</label>
          <div className="settings-color-row">
            <input
              type="color"
              className="settings-color-input"
              value={sidebarBgColor}
              onChange={(e) => setSidebarBgColor(e.target.value)}
            />
            <input
              type="text"
              className="settings-color-hex"
              value={sidebarBgColor}
              onChange={(e) => setSidebarBgColor(e.target.value)}
            />
            <button
              type="button"
              className="btn-reset-color"
              onClick={() => setSidebarBgColor("#1f2937")}
            >
              Đặt lại
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="settings-section settings-deleted-section">
            <button
              type="button"
              className="btn-deleted-items-settings"
              onClick={() => {
                onClose();
                onDeletedItemsClick();
              }}
            >
              Các mục đã xóa
            </button>
          </div>
        )}

        <div className="settings-actions">
          <button type="button" className="btn-cancel" onClick={handleClose}>
            Hủy
          </button>
          <button
            type="button"
            className="btn-save"
            onClick={handleSave}
            disabled={saving || !hasChanges()}
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>

        {cropImageSrc && (
          <ImageCropModal
            imageSrc={cropImageSrc}
            aspectRatio={cropTarget === "logo" ? 1 : 4}
            cropShape={cropTarget === "logo" ? "round" : "rect"}
            onCancel={() => setCropImageSrc(null)}
            onCrop={handleImageCrop}
          />
        )}
      </div>
    </div>
  );
}
