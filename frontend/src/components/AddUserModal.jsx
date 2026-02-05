import { useState } from "react";
import { ImageCropModal } from "./ImageCropModal";
import "./AddUserModal.css";

export function AddUserModal({
  departments,
  defaultSubDepartmentIds = [],
  token,
  onClose,
  onUserCreated,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState(null);

  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileImg, setProfileImg] = useState("");
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Sub-department assignments: array of { sub_department_id, position }
  const initialAssignments = defaultSubDepartmentIds.map((id) => ({
    sub_department_id: id,
    position: "",
  }));
  const [assignments, setAssignments] = useState(
    initialAssignments.length > 0 ? initialAssignments : [],
  );

  // Track if user was created successfully (for non-admin users without password)
  const [createdUser, setCreatedUser] = useState(null);

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

  // Check if form has any data entered
  const hasUnsavedChanges = () => {
    return (
      username.trim() !== "" ||
      email.trim() !== "" ||
      firstName.trim() !== "" ||
      lastName.trim() !== "" ||
      profileImg !== "" ||
      assignments.length !== initialAssignments.length ||
      isAdmin
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: isAdmin ? username : null,
          email: email || null,
          first_name: firstName || null,
          last_name: lastName || null,
          profile_img: profileImg || null,
          sub_department_assignments: subDeptAssignments,
          is_admin: isAdmin,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Tạo người dùng thất bại");
      }

      const newUser = await response.json();
      if (newUser.generated_password) {
        setGeneratedPassword(newUser.generated_password);
      } else {
        setCreatedUser(newUser);
      }
      onUserCreated(newUser);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
  };

  // Show success screen
  if (generatedPassword || createdUser) {
    const displayName =
      firstName || lastName
        ? `${firstName} ${lastName}`.trim()
        : username || "Người dùng mới";

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content add-user-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="add-user-modal-header">
            <h2>Tạo người dùng thành công</h2>
            <button
              type="button"
              className="add-user-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          <div className="success-content">
            <div className="success-icon">✓</div>
            <p className="success-message">
              {isAdmin ? "Quản trị viên" : "Người dùng"}{" "}
              <strong>{displayName}</strong> đã được tạo.
            </p>

            {generatedPassword && (
              <div className="password-section">
                <label>Mật khẩu tạo tự động (chỉ hiển thị một lần):</label>
                <div className="password-display">
                  <code>{generatedPassword}</code>
                  <button
                    type="button"
                    className="btn-copy"
                    onClick={copyPassword}
                  >
                    Sao chép
                  </button>
                </div>
                <p className="password-warning">
                  Vui lòng lưu mật khẩu này. Sẽ không được hiển thị lại.
                </p>
              </div>
            )}

            {!generatedPassword && (
              <p className="info-message">
                Người dùng thường không có tài khoản đăng nhập.
              </p>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-save" onClick={onClose}>
              Hoàn tất
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content add-user-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="add-user-modal-header">
          <h2>Thêm người dùng mới</h2>
          <button
            type="button"
            className="add-user-close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="add-user-profile-section">
            <div className="profile-img-wrapper">
              <img
                src={
                  profileImg ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    firstName || lastName
                      ? `${firstName} ${lastName}`.trim()
                      : username || "Người dùng mới",
                  )}&background=6b7280&color=fff&size=128`
                }
                alt="Profile"
                className="profile-preview"
              />
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
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">Tên</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Họ</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Sub-department assignments */}
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

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
              />
              <span>Cấp quyền quản trị viên</span>
            </label>
            <p className="checkbox-hint">
              Quản trị viên có thể đăng nhập và quản lý hệ thống.
            </p>
          </div>

          {isAdmin && (
            <div className="form-group">
              <label htmlFor="username">Tên đăng nhập *</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <p className="form-note">
                Mật khẩu sẽ được tạo ngẫu nhiên cho quản trị viên này.
              </p>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Hủy
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={saving || (isAdmin && !username.trim())}
            >
              {saving ? "Đang tạo..." : "Tạo người dùng"}
            </button>
          </div>
        </form>

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
