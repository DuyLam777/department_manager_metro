import { useState, useEffect } from "react";
import { ImageCropModal } from "./ImageCropModal";
import "./UserDetailModal.css";

export function UserDetailModal({
  userId,
  departments,
  isAdmin,
  token,
  onClose,
  onUpdate,
  onDelete,
}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [newPassword, setNewPassword] = useState(null);

  // Original values to detect changes
  const [originalValues, setOriginalValues] = useState(null);

  // Form state: "dept-1" or "sub-2" for department/sub_department
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileImg, setProfileImg] = useState("");
  const [departmentOrSub, setDepartmentOrSub] = useState("");
  const [position, setPosition] = useState("");
  const [cropImageSrc, setCropImageSrc] = useState(null);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error("Tải thông tin người dùng thất bại");
      const data = await response.json();
      setUser(data);

      // Set form values
      setUsername(data.username);
      setEmail(data.email || "");
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setProfileImg(data.profile_img || "");
      setPosition(data.position || "");
      const place = data.sub_department_id
        ? `sub-${data.sub_department_id}`
        : data.department_id
          ? `dept-${data.department_id}`
          : "";
      setDepartmentOrSub(place);

      // Store original values for change detection
      setOriginalValues({
        username: data.username,
        email: data.email || "",
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        profileImg: data.profile_img || "",
        departmentOrSub: place,
        position: data.position || "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if form has unsaved changes
  const hasUnsavedChanges = () => {
    if (!originalValues || !isAdmin) return false;
    return (
      username !== originalValues.username ||
      email !== originalValues.email ||
      firstName !== originalValues.firstName ||
      lastName !== originalValues.lastName ||
      profileImg !== originalValues.profileImg ||
      departmentOrSub !== originalValues.departmentOrSub ||
      position !== originalValues.position
    );
  };

  // Handle close with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges()) {
      if (confirm("Bạn có thay đổi chưa lưu. Bỏ chúng?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getDisplayName = () => {
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    return username;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const [departmentId, subDepartmentId] = departmentOrSub.startsWith("sub-")
        ? [null, parseInt(departmentOrSub.slice(4), 10)]
        : departmentOrSub.startsWith("dept-")
          ? [parseInt(departmentOrSub.slice(5), 10), null]
          : [null, null];

      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          email: email || null,
          first_name: firstName || null,
          last_name: lastName || null,
          profile_img: profileImg || null,
          department_id: departmentId,
          sub_department_id: subDepartmentId,
          position: position || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Cập nhật người dùng thất bại");
      }

      const updatedUser = await response.json();
      onUpdate(updatedUser);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm(`Bạn có chắc muốn đặt lại mật khẩu cho ${username}?`)) {
      return;
    }

    setResetting(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Đặt lại mật khẩu thất bại");
      }

      const result = await response.json();
      setNewPassword(result.new_password);
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(newPassword);
  };

  const handleDelete = async () => {
    const displayName = getDisplayName();
    if (
      !confirm(
        `Bạn có chắc muốn xóa ${displayName}? Hành động này không thể hoàn tác.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Xóa người dùng thất bại");
      }

      onDelete(userId);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={handleClose}>
        <div
          className="modal-content user-detail-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  const displayName = getDisplayName();

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content user-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{isAdmin ? "Chỉnh sửa người dùng" : "Chi tiết người dùng"}</h2>
          <button className="close-btn" onClick={handleClose}>
            &times;
          </button>
        </div>

        <div className="user-profile-section">
          <div className="profile-img-wrapper">
            <img
              src={
                profileImg ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6b7280&color=fff&size=128`
              }
              alt={displayName}
              className="profile-preview"
            />
            {isAdmin && (
              <label className="profile-upload-overlay" title="Tải ảnh hồ sơ">
                <input
                  type="file"
                  accept="image/*"
                  className="profile-upload-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setCropImageSrc(reader.result);
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
                <span className="profile-upload-icon">&#x1F4F7;</span>
              </label>
            )}
          </div>
          {user?.is_admin && <span className="admin-tag">Quản trị viên</span>}
        </div>

        {(user?.effective_department || user?.department || user?.position) && (
          <div className="user-department-display">
            <div className="department-display-row">
              <span className="department-display-label">Bộ phận:</span>
              <span className="department-display-value">
                {user.effective_bo_phan ||
                  user.effective_department ||
                  user.department ||
                  user.bo_phan ||
                  "-"}
              </span>
            </div>
            {user?.sub_department && (
              <div className="department-display-row">
                <span className="department-display-label">Ban:</span>
                <span className="department-display-value">
                  {user.sub_department}
                </span>
              </div>
            )}
            <div className="department-display-row">
              <span className="department-display-label">Chức vụ:</span>
              <span className="department-display-value">
                {user.position ||
                  (user.is_admin ? "Quản trị viên" : "Người dùng")}
              </span>
            </div>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">Tên</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={!isAdmin}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Họ</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="username">Tên đăng nhập</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={!isAdmin}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!isAdmin}
          />
        </div>

        <div className="form-group">
          <label htmlFor="position">Chức vụ</label>
          <input
            id="position"
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            disabled={!isAdmin}
          />
        </div>

        <div className="form-group">
          <label htmlFor="department">Bộ phận / Ban</label>
          <select
            id="department"
            value={departmentOrSub}
            onChange={(e) => setDepartmentOrSub(e.target.value)}
            disabled={!isAdmin}
          >
            <option value="">Không có bộ phận</option>
            {departments.map((dept) => (
              <optgroup key={dept.id} label={dept.name}>
                <option value={`dept-${dept.id}`}>{dept.name}</option>
                {(dept.sub_departments || []).map((sub) => (
                  <option key={`sub-${sub.id}`} value={`sub-${sub.id}`}>
                    — {sub.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {isAdmin && (
          <div className="password-reset-section">
            <label>Mật khẩu</label>
            {newPassword ? (
              <div className="new-password-display">
                <code>{newPassword}</code>
                <button
                  type="button"
                  className="btn-copy"
                  onClick={copyPassword}
                >
                  Copy
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-reset-password"
                onClick={handleResetPassword}
                disabled={resetting}
              >
                {resetting ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
              </button>
            )}
            {newPassword && (
              <p className="password-warning">
                Lưu mật khẩu này ngay. Nó sẽ không được hiển thị lại.
              </p>
            )}
          </div>
        )}

        {isAdmin && !user?.is_admin && (
          <div className="danger-zone">
            <label>Khu vực nguy hiểm</label>
            <button
              type="button"
              className="btn-delete"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Đang xóa..." : "Xóa người dùng"}
            </button>
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={handleClose}>
            {isAdmin ? "Hủy" : "Đóng"}
          </button>
          {isAdmin && (
            <button
              type="button"
              className="btn-save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          )}
        </div>

        {cropImageSrc && (
          <ImageCropModal
            imageSrc={cropImageSrc}
            aspectRatio={1}
            cropShape="round"
            onCancel={() => setCropImageSrc(null)}
            onCrop={async (blob) => {
              const formData = new FormData();
              formData.append("file", blob, "profile.jpg");
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
                setProfileImg(url);
              } catch (err) {
                setError(err.message);
              }
              setCropImageSrc(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
