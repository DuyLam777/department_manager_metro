import { useState, useEffect } from "react";
import { ImageCropModal } from "./ImageCropModal";
import "./UserDetailModal.css";

export function UserDetailModal({
  userId,
  currentUserId,
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

  // State for custom password setting (only for self-edit)
  const [customPassword, setCustomPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Original values to detect changes
  const [originalValues, setOriginalValues] = useState(null);

  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileImg, setProfileImg] = useState("");
  const [cropImageSrc, setCropImageSrc] = useState(null);

  // Sub-department assignments: array of { sub_department_id, position }
  const [assignments, setAssignments] = useState([]);

  // Check if editing self
  const isEditingSelf = userId === currentUserId;

  // Get all sub-departments flattened for selection
  const getAllSubDepartments = () => {
    const subs = [];
    departments.forEach((dept) => {
      if (!dept.is_placeholder) {
        (dept.sub_departments || []).forEach((sub) => {
          subs.push({
            ...sub,
            departmentName: dept.name,
            departmentId: dept.id,
          });
        });
      }
    });
    return subs;
  };

  const allSubDepartments = getAllSubDepartments();

  // Get sub-departments that haven't been selected yet
  const getAvailableSubDepartments = (excludeIndex = -1) => {
    const selectedIds = assignments
      .filter((_, idx) => idx !== excludeIndex)
      .map((a) => a.sub_department_id);
    return allSubDepartments.filter((s) => !selectedIds.includes(s.id));
  };

  // Add a new assignment
  const addAssignment = () => {
    const available = getAvailableSubDepartments();
    if (available.length > 0) {
      setAssignments([
        ...assignments,
        { sub_department_id: available[0].id, position: "" },
      ]);
    }
  };

  // Remove an assignment
  const removeAssignment = (index) => {
    setAssignments(assignments.filter((_, idx) => idx !== index));
  };

  // Update an assignment
  const updateAssignment = (index, field, value) => {
    const updated = [...assignments];
    updated[index] = { ...updated[index], [field]: value };
    setAssignments(updated);
  };

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
      setUsername(data.username || "");
      setEmail(data.email || "");
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setProfileImg(data.profile_img || "");

      // Parse sub_department_assignments
      const assignmentsData = (data.sub_department_assignments || [])
        .filter((a) => !a.is_placeholder)
        .map((a) => ({
          sub_department_id: a.sub_department_id,
          position: a.position || "",
        }));
      setAssignments(assignmentsData);

      // Store original values for change detection
      setOriginalValues({
        username: data.username || "",
        email: data.email || "",
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        profileImg: data.profile_img || "",
        assignments: JSON.stringify(assignmentsData),
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
      JSON.stringify(assignments) !== originalValues.assignments
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
    return username || "Người dùng";
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Build sub_department_assignments array
      const subDeptAssignments = assignments
        .filter((a) => a.sub_department_id)
        .map((a) => ({
          sub_department_id: a.sub_department_id,
          position: a.position || null,
        }));

      const updateData = {
        email: email || null,
        first_name: firstName || null,
        last_name: lastName || null,
        profile_img: profileImg || null,
        sub_department_assignments: subDeptAssignments,
      };

      // Only update username for admin users (they're the only ones with usernames)
      if (user?.is_admin) {
        updateData.username = username;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
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
    const name = getDisplayName();
    if (!confirm(`Bạn có chắc muốn đặt lại mật khẩu cho ${name}?`)) {
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

  const handleSetPassword = async () => {
    if (customPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (customPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setSettingPassword(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${userId}/set-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: customPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Đặt mật khẩu thất bại");
      }

      setPasswordSuccess(true);
      setCustomPassword("");
      setConfirmPassword("");
      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSettingPassword(false);
    }
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

  // Get department info display for read-only view
  const getDepartmentInfoDisplay = () => {
    const userAssignments = (user?.sub_department_assignments || []).filter(
      (a) => !a.is_placeholder,
    );
    if (userAssignments.length === 0) {
      return null;
    }
    return userAssignments;
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
  const departmentInfo = getDepartmentInfoDisplay();

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

        {/* Department info display (read-only summary) */}
        {departmentInfo && departmentInfo.length > 0 && !isAdmin && (
          <div className="user-department-display">
            {departmentInfo.length === 1 ? (
              <>
                <div className="department-display-row">
                  <span className="department-display-label">Bộ phận:</span>
                  <span className="department-display-value">
                    {departmentInfo[0].department_name || "-"}
                  </span>
                </div>
                <div className="department-display-row">
                  <span className="department-display-label">Phòng:</span>
                  <span className="department-display-value">
                    {departmentInfo[0].sub_department_name || "-"}
                  </span>
                </div>
                <div className="department-display-row">
                  <span className="department-display-label">Chức vụ:</span>
                  <span className="department-display-value">
                    {departmentInfo[0].position ||
                      (user.is_admin ? "Quản trị viên" : "Người dùng")}
                  </span>
                </div>
              </>
            ) : (
              <div className="department-display-multi">
                <span className="department-display-label">
                  Các Phòng ({departmentInfo.length}):
                </span>
                <div className="department-assignments-list">
                  {departmentInfo.map((a, idx) => (
                    <div key={idx} className="department-assignment-item">
                      <span className="assignment-dept">
                        {a.sub_department_name} ({a.department_name})
                      </span>
                      <span className="assignment-position">
                        {a.position || "Chưa có chức vụ"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

        {/* Only show username field for admin users being viewed */}
        {user?.is_admin && (
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
        )}

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

        {/* Sub-department assignments - editable for admin */}
        {isAdmin && (
          <div className="form-group">
            <label>Phòng / Chức vụ</label>
            <div className="assignments-list">
              {assignments.map((assignment, index) => {
                const available = getAvailableSubDepartments(index);
                const currentSub = allSubDepartments.find(
                  (s) => s.id === assignment.sub_department_id,
                );
                // Include current selection in dropdown options
                const options = currentSub
                  ? [
                      currentSub,
                      ...available.filter((s) => s.id !== currentSub.id),
                    ]
                  : available;

                return (
                  <div key={index} className="assignment-row">
                    <select
                      value={assignment.sub_department_id || ""}
                      onChange={(e) =>
                        updateAssignment(
                          index,
                          "sub_department_id",
                          parseInt(e.target.value, 10),
                        )
                      }
                      className="assignment-select"
                    >
                      <option value="">Chọn Phòng...</option>
                      {options.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} ({sub.departmentName})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Chức vụ"
                      value={assignment.position}
                      onChange={(e) =>
                        updateAssignment(index, "position", e.target.value)
                      }
                      className="assignment-position"
                    />
                    <button
                      type="button"
                      className="btn-remove-assignment"
                      onClick={() => removeAssignment(index)}
                      title="Xóa"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
              {getAvailableSubDepartments().length > 0 && (
                <button
                  type="button"
                  className="btn-add-assignment"
                  onClick={addAssignment}
                >
                  + Thêm Phòng
                </button>
              )}
              {assignments.length === 0 && (
                <p className="form-note">
                  Người dùng chưa được gán vào Phòng nào.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Only show password section for admin users being viewed, and only if current user is admin */}
        {isAdmin && user?.is_admin && (
          <div className="password-reset-section">
            <label>Mật khẩu</label>

            {/* Show custom password form when editing self */}
            {isEditingSelf && (
              <div className="set-password-form">
                <div className="password-input-group">
                  <input
                    type="password"
                    placeholder="Mật khẩu mới"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Xác nhận mật khẩu"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn-set-password"
                  onClick={handleSetPassword}
                  disabled={
                    settingPassword || !customPassword || !confirmPassword
                  }
                >
                  {settingPassword ? "Đang lưu..." : "Đặt mật khẩu"}
                </button>
                {passwordSuccess && (
                  <p className="password-success">Mật khẩu đã được cập nhật!</p>
                )}
              </div>
            )}

            {/* Show reset password button when viewing other admins */}
            {!isEditingSelf && (
              <>
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
              </>
            )}
          </div>
        )}

        {isAdmin && (
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
