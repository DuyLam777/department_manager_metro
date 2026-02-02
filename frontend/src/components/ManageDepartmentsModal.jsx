import { useState, useEffect, useRef } from "react";
import { ImageCropModal } from "./ImageCropModal";
import "./ManageDepartmentsModal.css";

const API = "/api";

export function ManageDepartmentsModal({ token, onClose, onSaved }) {
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state: which form is open
  const [addDepartment, setAddDepartment] = useState(false);
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [addSubForDeptId, setAddSubForDeptId] = useState(null);
  const [editingSubId, setEditingSubId] = useState(null);

  // Selected unassigned user ids when adding to department
  const [selectedUserIdsToAdd, setSelectedUserIdsToAdd] = useState(new Set());

  // Form values
  const [deptName, setDeptName] = useState("");
  const [deptDescription, setDeptDescription] = useState("");
  const [deptProfileImg, setDeptProfileImg] = useState("");
  const [subName, setSubName] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [subProfileImg, setSubProfileImg] = useState("");
  const [subDepartmentId, setSubDepartmentId] = useState("");
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const cropTargetRef = useRef(null);

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, usersRes] = await Promise.all([
        fetch(`${API}/departments`),
        fetch(`${API}/users`),
      ]);
      if (!deptRes.ok) throw new Error("Tải phòng thất bại");
      if (!usersRes.ok) throw new Error("Tải người dùng thất bại");
      const [deptData, usersData] = await Promise.all([
        deptRes.json(),
        usersRes.json(),
      ]);
      setDepartments(deptData);
      setUsers(usersData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const unassignedUsers = users.filter(
    (u) => u.effective_department === "Chưa phân công",
  );
  const placeholderDeptId = departments.find((d) => d.is_placeholder)?.id;
  // Users directly in the department being edited (department_id set, no sub_department)
  const currentDepartmentUsers = editingDepartmentId
    ? users.filter(
        (u) => u.department_id === editingDepartmentId && !u.sub_department_id,
      )
    : [];
  // Users in the sub-department being edited
  const currentSubUsers = editingSubId
    ? users.filter((u) => u.sub_department_id === editingSubId)
    : [];

  const resetForms = () => {
    setAddDepartment(false);
    setEditingDepartmentId(null);
    setAddSubForDeptId(null);
    setEditingSubId(null);
    setSelectedUserIdsToAdd(new Set());
    setDeptName("");
    setDeptDescription("");
    setDeptProfileImg("");
    setSubName("");
    setSubDescription("");
    setSubProfileImg("");
    setSubDepartmentId("");
  };

  const toggleUserToAdd = (userId) => {
    setSelectedUserIdsToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSaveDepartmentAssignments = async () => {
    if (!editingDepartmentId || !placeholderDeptId) return;
    setSaving(true);
    setError(null);
    try {
      const currentIds = users
        .filter(
          (u) =>
            u.department_id === editingDepartmentId && !u.sub_department_id,
        )
        .map((u) => u.id);
      const toUnassign = currentIds.filter(
        (id) => !selectedUserIdsToAdd.has(id),
      );
      const toAssign = [...selectedUserIdsToAdd];
      const assignResults = await Promise.all(
        toAssign.map((userId) =>
          fetch(`${API}/users/${userId}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({
              department_id: editingDepartmentId,
              sub_department_id: null,
            }),
          }).then((r) => r.ok),
        ),
      );
      const unassignResults = await Promise.all(
        toUnassign.map((userId) =>
          fetch(`${API}/users/${userId}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({
              department_id: placeholderDeptId,
              sub_department_id: null,
            }),
          }).then((r) => r.ok),
        ),
      );
      if (assignResults.some((ok) => !ok))
        throw new Error("Không thể gán một số người dùng");
      if (unassignResults.some((ok) => !ok))
        throw new Error("Không thể bỏ gán một số người dùng");
      await fetchDepartments();
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSubDepartmentAssignments = async () => {
    if (!editingSubId || !placeholderDeptId) return;
    setSaving(true);
    setError(null);
    try {
      const currentIds = users
        .filter((u) => u.sub_department_id === editingSubId)
        .map((u) => u.id);
      const toUnassign = currentIds.filter(
        (id) => !selectedUserIdsToAdd.has(id),
      );
      const toAssign = [...selectedUserIdsToAdd];
      const assignResults = await Promise.all(
        toAssign.map((userId) =>
          fetch(`${API}/users/${userId}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({ sub_department_id: editingSubId }),
          }).then((r) => r.ok),
        ),
      );
      const unassignResults = await Promise.all(
        toUnassign.map((userId) =>
          fetch(`${API}/users/${userId}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({
              department_id: placeholderDeptId,
              sub_department_id: null,
            }),
          }).then((r) => r.ok),
        ),
      );
      if (assignResults.some((ok) => !ok))
        throw new Error("Không thể gán một số người dùng");
      if (unassignResults.some((ok) => !ok))
        throw new Error("Không thể bỏ gán một số người dùng");
      await fetchDepartments();
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/departments`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: deptName.trim(),
          description: deptDescription.trim() || null,
          profile_img: deptProfileImg || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Tạo phòng thất bại");
      }
      const created = await res.json();
      if (selectedUserIdsToAdd.size > 0 && created.id) {
        const results = await Promise.all(
          [...selectedUserIdsToAdd].map((userId) =>
            fetch(`${API}/users/${userId}`, {
              method: "PUT",
              headers: authHeaders(),
              body: JSON.stringify({
                department_id: created.id,
                sub_department_id: null,
              }),
            }).then((r) => r.ok),
          ),
        );
        if (results.some((ok) => !ok))
          throw new Error("Không thể thêm một số người dùng vào phòng mới");
      }
      await fetchDepartments();
      onSaved?.();
      resetForms();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/departments/${editingDepartmentId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          name: deptName.trim(),
          description: deptDescription.trim() || null,
          profile_img: deptProfileImg || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Cập nhật phòng thất bại");
      }
      await fetchDepartments();
      onSaved?.();
      resetForms();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartment = async (dept) => {
    if (dept.is_placeholder) return;
    if (
      !confirm(
        `Xóa phòng "${dept.name}"? Các ban và người dùng sẽ được chuyển sang Chưa phân công.`,
      )
    )
      return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/departments/${dept.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Xóa phòng thất bại");
      }
      await fetchDepartments();
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubDepartment = async (e) => {
    e.preventDefault();
    if (!addSubForDeptId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/sub-departments`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: subName.trim(),
          description: subDescription.trim() || null,
          profile_img: subProfileImg || null,
          department_id: parseInt(addSubForDeptId, 10),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Tạo ban thất bại");
      }
      const created = await res.json();
      if (selectedUserIdsToAdd.size > 0 && created.id) {
        const results = await Promise.all(
          [...selectedUserIdsToAdd].map((userId) =>
            fetch(`${API}/users/${userId}`, {
              method: "PUT",
              headers: authHeaders(),
              body: JSON.stringify({ sub_department_id: created.id }),
            }).then((r) => r.ok),
          ),
        );
        if (results.some((ok) => !ok))
          throw new Error("Không thể thêm một số người dùng vào ban mới");
      }
      await fetchDepartments();
      onSaved?.();
      setAddSubForDeptId(null);
      setSubName("");
      setSubDescription("");
      setSubProfileImg("");
      setSelectedUserIdsToAdd(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSubDepartment = async (e) => {
    e.preventDefault();
    if (!editingSubId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/sub-departments/${editingSubId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          name: subName.trim(),
          description: subDescription.trim() || null,
          profile_img: subProfileImg || null,
          department_id: subDepartmentId
            ? parseInt(subDepartmentId, 10)
            : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Cập nhật ban thất bại");
      }
      await fetchDepartments();
      onSaved?.();
      resetForms();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubDepartment = async (sub, deptName) => {
    if (sub.is_placeholder) return;
    if (
      !confirm(
        `Xóa ban "${sub.name}" (${deptName})? Người dùng sẽ được chuyển sang Chưa phân công.`,
      )
    )
      return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/sub-departments/${sub.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Xóa ban thất bại");
      }
      await fetchDepartments();
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEditDepartment = (dept) => {
    if (dept.is_placeholder) return;
    setEditingDepartmentId(dept.id);
    setDeptName(dept.name);
    setDeptDescription(dept.description || "");
    setDeptProfileImg(dept.profile_img || "");
    const currentIds = users
      .filter((u) => u.department_id === dept.id && !u.sub_department_id)
      .map((u) => u.id);
    setSelectedUserIdsToAdd(new Set(currentIds));
  };

  const startEditSub = (sub) => {
    if (sub.is_placeholder) return;
    setEditingSubId(sub.id);
    setSubName(sub.name);
    setSubDescription(sub.description || "");
    setSubProfileImg(sub.profile_img || "");
    setSubDepartmentId(String(sub.department_id));
    const currentIds = users
      .filter((u) => u.sub_department_id === sub.id)
      .map((u) => u.id);
    setSelectedUserIdsToAdd(new Set(currentIds));
  };

  const handleImageUpload = (e, setImg) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      cropTargetRef.current = setImg;
      setCropImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const isAdmin = !!token;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content manage-departments-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="manage-dept-modal-header">
          <h2>Bộ phận &amp; Ban</h2>
          <button
            type="button"
            className="manage-dept-close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {!isAdmin && (
          <p className="manage-dept-readonly">
            Bạn đang xem ở chế độ chỉ đọc. Đăng nhập với tài khoản quản trị để
            thêm, chỉnh sửa hoặc xóa.
          </p>
        )}

        {error && <p className="error-message">{error}</p>}

        {loading ? (
          <p>Đang tải...</p>
        ) : (
          <div className="manage-dept-list">
            {addDepartment && (
              <div className="manage-dept-form-card">
                <h3>Thêm bộ phận</h3>
                <form onSubmit={handleCreateDepartment}>
                  <div className="form-group">
                    <label>Tên *</label>
                    <input
                      type="text"
                      value={deptName}
                      onChange={(e) => setDeptName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>Mô tả</label>
                    <input
                      type="text"
                      value={deptDescription}
                      onChange={(e) => setDeptDescription(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Hình ảnh</label>
                    <div className="dept-img-upload">
                      {deptProfileImg && (
                        <img
                          src={deptProfileImg}
                          alt=""
                          className="dept-img-preview"
                        />
                      )}
                      <label className="btn-upload-img">
                        {deptProfileImg ? "Thay đổi" : "Tải lên"}
                        <input
                          type="file"
                          accept="image/*"
                          className="profile-upload-input"
                          onChange={(e) =>
                            handleImageUpload(e, setDeptProfileImg)
                          }
                        />
                      </label>
                      {deptProfileImg && (
                        <button
                          type="button"
                          className="btn-remove-img"
                          onClick={() => setDeptProfileImg("")}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                  {unassignedUsers.length > 0 && (
                    <div className="manage-dept-add-users">
                      <h4>Thêm người dùng từ Chưa phân công</h4>
                      <ul className="unassigned-users-list">
                        {unassignedUsers.map((u) => {
                          const displayName =
                            [u.first_name, u.last_name]
                              .filter(Boolean)
                              .join(" ") || u.username;
                          return (
                            <li key={u.id}>
                              <label className="unassigned-user-row">
                                <input
                                  type="checkbox"
                                  checked={selectedUserIdsToAdd.has(u.id)}
                                  onChange={() => toggleUserToAdd(u.id)}
                                />
                                <span>
                                  {displayName}
                                  {displayName !== u.username && u.username
                                    ? ` (${u.username})`
                                    : ""}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setAddDepartment(false)}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn-save"
                      disabled={saving || !deptName.trim()}
                    >
                      {saving
                        ? "Đang lưu..."
                        : `Tạo${selectedUserIdsToAdd.size > 0 ? ` và thêm ${selectedUserIdsToAdd.size} người` : ""}`}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {isAdmin && !addDepartment && (
              <button
                type="button"
                className="btn-add-dept"
                onClick={() => {
                  setAddDepartment(true);
                  setSelectedUserIdsToAdd(new Set());
                }}
              >
                + Thêm phòng
              </button>
            )}

            {departments.map((dept) => (
              <div key={dept.id} className="manage-dept-card">
                {editingDepartmentId === dept.id ? (
                  <div className="manage-dept-form-inline">
                    <form onSubmit={handleUpdateDepartment}>
                      <div className="form-group">
                        <label>Tên *</label>
                        <input
                          type="text"
                          value={deptName}
                          onChange={(e) => setDeptName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Mô tả</label>
                        <input
                          type="text"
                          value={deptDescription}
                          onChange={(e) => setDeptDescription(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Hình ảnh</label>
                        <div className="dept-img-upload">
                          {deptProfileImg && (
                            <img
                              src={deptProfileImg}
                              alt=""
                              className="dept-img-preview"
                            />
                          )}
                          <label className="btn-upload-img">
                            {deptProfileImg ? "Thay đổi" : "Tải lên"}
                            <input
                              type="file"
                              accept="image/*"
                              className="profile-upload-input"
                              onChange={(e) =>
                                handleImageUpload(e, setDeptProfileImg)
                              }
                            />
                          </label>
                          {deptProfileImg && (
                            <button
                              type="button"
                              className="btn-remove-img"
                              onClick={() => setDeptProfileImg("")}
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="form-actions">
                        <button
                          type="button"
                          className="btn-cancel"
                          onClick={() => setEditingDepartmentId(null)}
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="btn-save"
                          disabled={saving}
                        >
                          {saving ? "Đang lưu..." : "Lưu"}
                        </button>
                      </div>
                    </form>
                    {!dept.is_placeholder &&
                      (unassignedUsers.length > 0 ||
                        currentDepartmentUsers.length > 0) && (
                        <div className="manage-dept-add-users">
                          <h4>Gán người dùng vào {deptName || dept.name}</h4>
                          {unassignedUsers.length > 0 && (
                            <>
                              <p className="manage-dept-user-group-label">
                                Chưa phân công
                              </p>
                              <ul className="unassigned-users-list">
                                {unassignedUsers.map((u) => {
                                  const displayName =
                                    [u.first_name, u.last_name]
                                      .filter(Boolean)
                                      .join(" ") || u.username;
                                  return (
                                    <li key={u.id}>
                                      <label className="unassigned-user-row">
                                        <input
                                          type="checkbox"
                                          checked={selectedUserIdsToAdd.has(
                                            u.id,
                                          )}
                                          onChange={() => toggleUserToAdd(u.id)}
                                        />
                                        <span>
                                          {displayName}
                                          {displayName !== u.username &&
                                          u.username
                                            ? ` (${u.username})`
                                            : ""}
                                        </span>
                                      </label>
                                    </li>
                                  );
                                })}
                              </ul>
                            </>
                          )}
                          {unassignedUsers.length > 0 &&
                            currentDepartmentUsers.length > 0 && (
                              <div
                                className="manage-dept-user-separator"
                                aria-hidden="true"
                              />
                            )}
                          {currentDepartmentUsers.length > 0 && (
                            <>
                              <p className="manage-dept-user-group-label">
                                Hiện đang trong {deptName || dept.name}
                              </p>
                              <ul className="unassigned-users-list">
                                {currentDepartmentUsers.map((u) => {
                                  const displayName =
                                    [u.first_name, u.last_name]
                                      .filter(Boolean)
                                      .join(" ") || u.username;
                                  return (
                                    <li key={u.id}>
                                      <label className="unassigned-user-row">
                                        <input
                                          type="checkbox"
                                          checked={selectedUserIdsToAdd.has(
                                            u.id,
                                          )}
                                          onChange={() => toggleUserToAdd(u.id)}
                                        />
                                        <span>
                                          {displayName}
                                          {displayName !== u.username &&
                                          u.username
                                            ? ` (${u.username})`
                                            : ""}
                                        </span>
                                      </label>
                                    </li>
                                  );
                                })}
                              </ul>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn-add-users-to-dept"
                            onClick={handleSaveDepartmentAssignments}
                            disabled={saving}
                          >
                            {saving ? "Đang lưu..." : "Lưu phân công"}
                          </button>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="manage-dept-row">
                    <div className="manage-dept-info">
                      <span className="manage-dept-name">
                        {dept.name}
                        {dept.is_placeholder && (
                          <span className="placeholder-badge">
                            Chưa phân công
                          </span>
                        )}
                      </span>
                      {dept.description && (
                        <span className="manage-dept-desc">
                          {dept.description}
                        </span>
                      )}
                      <span className="manage-dept-count">
                        {dept.user_count} người
                      </span>
                    </div>
                    {isAdmin && !dept.is_placeholder && (
                      <div className="manage-dept-actions">
                        <button
                          type="button"
                          className="btn-edit"
                          onClick={() => startEditDepartment(dept)}
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => handleDeleteDepartment(dept)}
                          disabled={saving}
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {addSubForDeptId === dept.id && (
                  <div className="manage-sub-form">
                    <form onSubmit={handleCreateSubDepartment}>
                      <div className="form-group">
                        <label>Tên ban *</label>
                        <input
                          type="text"
                          value={subName}
                          onChange={(e) => setSubName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Mô tả</label>
                        <input
                          type="text"
                          value={subDescription}
                          onChange={(e) => setSubDescription(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Hình ảnh</label>
                        <div className="dept-img-upload">
                          {subProfileImg && (
                            <img
                              src={subProfileImg}
                              alt=""
                              className="dept-img-preview"
                            />
                          )}
                          <label className="btn-upload-img">
                            {subProfileImg ? "Thay đổi" : "Tải lên"}
                            <input
                              type="file"
                              accept="image/*"
                              className="profile-upload-input"
                              onChange={(e) =>
                                handleImageUpload(e, setSubProfileImg)
                              }
                            />
                          </label>
                          {subProfileImg && (
                            <button
                              type="button"
                              className="btn-remove-img"
                              onClick={() => setSubProfileImg("")}
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                      {unassignedUsers.length > 0 && (
                        <div className="manage-dept-add-users">
                          <h4>Thêm người dùng từ Chưa phân công</h4>
                          <ul className="unassigned-users-list">
                            {unassignedUsers.map((u) => {
                              const displayName =
                                [u.first_name, u.last_name]
                                  .filter(Boolean)
                                  .join(" ") || u.username;
                              return (
                                <li key={u.id}>
                                  <label className="unassigned-user-row">
                                    <input
                                      type="checkbox"
                                      checked={selectedUserIdsToAdd.has(u.id)}
                                      onChange={() => toggleUserToAdd(u.id)}
                                    />
                                    <span>
                                      {displayName}
                                      {displayName !== u.username && u.username
                                        ? ` (${u.username})`
                                        : ""}
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      <div className="form-actions">
                        <button
                          type="button"
                          className="btn-cancel"
                          onClick={() => setAddSubForDeptId(null)}
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="btn-save"
                          disabled={saving || !subName.trim()}
                        >
                          {saving
                            ? "Đang lưu..."
                            : `Tạo${selectedUserIdsToAdd.size > 0 ? ` và thêm ${selectedUserIdsToAdd.size} người` : ""}`}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {isAdmin &&
                  !dept.is_placeholder &&
                  addSubForDeptId !== dept.id && (
                    <button
                      type="button"
                      className="btn-add-sub"
                      onClick={() => {
                        setAddSubForDeptId(dept.id);
                        setSelectedUserIdsToAdd(new Set());
                      }}
                    >
                      + Thêm ban
                    </button>
                  )}

                <ul className="manage-sub-list">
                  {(dept.sub_departments || []).map((sub) => (
                    <li key={sub.id}>
                      {editingSubId === sub.id ? (
                        <div className="manage-sub-form-inline">
                          <form onSubmit={handleUpdateSubDepartment}>
                            <div className="form-group">
                              <label>Tên *</label>
                              <input
                                type="text"
                                value={subName}
                                onChange={(e) => setSubName(e.target.value)}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Mô tả</label>
                              <input
                                type="text"
                                value={subDescription}
                                onChange={(e) =>
                                  setSubDescription(e.target.value)
                                }
                              />
                            </div>
                            <div className="form-group">
                              <label>Hình ảnh</label>
                              <div className="dept-img-upload">
                                {subProfileImg && (
                                  <img
                                    src={subProfileImg}
                                    alt=""
                                    className="dept-img-preview"
                                  />
                                )}
                                <label className="btn-upload-img">
                                  {subProfileImg ? "Thay đổi" : "Tải lên"}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="profile-upload-input"
                                    onChange={(e) =>
                                      handleImageUpload(e, setSubProfileImg)
                                    }
                                  />
                                </label>
                                {subProfileImg && (
                                  <button
                                    type="button"
                                    className="btn-remove-img"
                                    onClick={() => setSubProfileImg("")}
                                  >
                                    Xóa
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="form-group">
                              <label>Phòng</label>
                              <select
                                value={subDepartmentId}
                                onChange={(e) =>
                                  setSubDepartmentId(e.target.value)
                                }
                              >
                                {departments
                                  .filter((d) => !d.is_placeholder)
                                  .map((d) => (
                                    <option key={d.id} value={d.id}>
                                      {d.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div className="form-actions">
                              <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => setEditingSubId(null)}
                              >
                                Hủy
                              </button>
                              <button
                                type="submit"
                                className="btn-save"
                                disabled={saving}
                              >
                                {saving ? "Đang lưu..." : "Lưu"}
                              </button>
                            </div>
                          </form>
                          {!sub.is_placeholder &&
                            (unassignedUsers.length > 0 ||
                              currentSubUsers.length > 0) && (
                              <div className="manage-dept-add-users">
                                <h4>
                                  Gán người dùng vào {subName || sub.name}
                                </h4>
                                {unassignedUsers.length > 0 && (
                                  <>
                                    <p className="manage-dept-user-group-label">
                                      Chưa phân công
                                    </p>
                                    <ul className="unassigned-users-list">
                                      {unassignedUsers.map((u) => {
                                        const displayName =
                                          [u.first_name, u.last_name]
                                            .filter(Boolean)
                                            .join(" ") || u.username;
                                        return (
                                          <li key={u.id}>
                                            <label className="unassigned-user-row">
                                              <input
                                                type="checkbox"
                                                checked={selectedUserIdsToAdd.has(
                                                  u.id,
                                                )}
                                                onChange={() =>
                                                  toggleUserToAdd(u.id)
                                                }
                                              />
                                              <span>
                                                {displayName}
                                                {displayName !== u.username &&
                                                u.username
                                                  ? ` (${u.username})`
                                                  : ""}
                                              </span>
                                            </label>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </>
                                )}
                                {unassignedUsers.length > 0 &&
                                  currentSubUsers.length > 0 && (
                                    <div
                                      className="manage-dept-user-separator"
                                      aria-hidden="true"
                                    />
                                  )}
                                {currentSubUsers.length > 0 && (
                                  <>
                                    <p className="manage-dept-user-group-label">
                                      Hiện đang trong {subName || sub.name}
                                    </p>
                                    <ul className="unassigned-users-list">
                                      {currentSubUsers.map((u) => {
                                        const displayName =
                                          [u.first_name, u.last_name]
                                            .filter(Boolean)
                                            .join(" ") || u.username;
                                        return (
                                          <li key={u.id}>
                                            <label className="unassigned-user-row">
                                              <input
                                                type="checkbox"
                                                checked={selectedUserIdsToAdd.has(
                                                  u.id,
                                                )}
                                                onChange={() =>
                                                  toggleUserToAdd(u.id)
                                                }
                                              />
                                              <span>
                                                {displayName}
                                                {displayName !== u.username &&
                                                u.username
                                                  ? ` (${u.username})`
                                                  : ""}
                                              </span>
                                            </label>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </>
                                )}
                                <button
                                  type="button"
                                  className="btn-add-users-to-dept"
                                  onClick={handleSaveSubDepartmentAssignments}
                                  disabled={saving}
                                >
                                  {saving ? "Đang lưu..." : "Lưu phân công"}
                                </button>
                              </div>
                            )}
                        </div>
                      ) : (
                        <div className="manage-sub-row">
                          <span className="manage-sub-name">
                            — {sub.name}
                            {sub.is_placeholder && (
                              <span className="placeholder-badge">
                                Chưa phân công
                              </span>
                            )}
                          </span>
                          <span className="manage-sub-count">
                            {sub.user_count} người
                          </span>
                          {isAdmin && !sub.is_placeholder && (
                            <span className="manage-sub-actions">
                              <button
                                type="button"
                                className="btn-edit"
                                onClick={() => startEditSub(sub)}
                              >
                                Chỉnh sửa
                              </button>
                              <button
                                type="button"
                                className="btn-delete"
                                onClick={() =>
                                  handleDeleteSubDepartment(sub, dept.name)
                                }
                                disabled={saving}
                              >
                                Xóa
                              </button>
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {cropImageSrc && (
          <ImageCropModal
            imageSrc={cropImageSrc}
            aspectRatio={1}
            cropShape="rect"
            onCancel={() => {
              setCropImageSrc(null);
              cropTargetRef.current = null;
            }}
            onCrop={async (blob) => {
              const formData = new FormData();
              formData.append("file", blob, "image.jpg");
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
                if (cropTargetRef.current) {
                  cropTargetRef.current(url);
                }
              } catch (err) {
                setError(err.message);
              }
              setCropImageSrc(null);
              cropTargetRef.current = null;
            }}
          />
        )}
      </div>
    </div>
  );
}
