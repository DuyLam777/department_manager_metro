import { useState, useEffect, useRef } from "react";
import { ImageCropModal } from "./ImageCropModal";
import "./ManageDepartmentsModal.css";

const API = "/api";

export function ManageDepartmentsModal({ token, onClose, onSaved }) {
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state: which form is open
  const [addDepartment, setAddDepartment] = useState(false);
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [addSubForDeptId, setAddSubForDeptId] = useState(null);
  const [editingSubId, setEditingSubId] = useState(null);
  const [addGroupForSubId, setAddGroupForSubId] = useState(null);
  const [editingGroupId, setEditingGroupId] = useState(null);

  // Selected unassigned user ids when adding to department
  const [selectedUserIdsToAdd, setSelectedUserIdsToAdd] = useState(new Set());
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState(
    new Set(),
  );

  // Form values
  const [deptName, setDeptName] = useState("");
  const [deptDescription, setDeptDescription] = useState("");
  const [deptProfileImg, setDeptProfileImg] = useState("");
  const [deptLocation, setDeptLocation] = useState("");
  const [subName, setSubName] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [subProfileImg, setSubProfileImg] = useState("");
  const [subLocation, setSubLocation] = useState("");
  const [subDepartmentId, setSubDepartmentId] = useState("");
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const cropTargetRef = useRef(null);

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, usersRes, groupsRes] = await Promise.all([
        fetch(`${API}/departments`),
        fetch(`${API}/users`),
        fetch(`${API}/groups`),
      ]);
      if (!deptRes.ok) throw new Error("Tải bộ phận thất bại");
      if (!usersRes.ok) throw new Error("Tải người dùng thất bại");
      if (!groupsRes.ok) throw new Error("Tải tổ thất bại");
      const [deptData, usersData, groupsData] = await Promise.all([
        deptRes.json(),
        usersRes.json(),
        groupsRes.json(),
      ]);
      setDepartments(deptData);
      setUsers(usersData);
      setGroups(groupsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Get users who are unassigned (in placeholder sub-department or no assignments)
  const unassignedUsers = users.filter((u) => {
    const assignments = u.sub_department_assignments || [];
    if (assignments.length === 0) return true;
    // User is unassigned if all their assignments are to placeholder sub-departments
    return assignments.every((a) => a.is_placeholder);
  });

  // Find placeholder sub-department for reassigning users
  const placeholderSubDept = departments
    .find((d) => d.is_placeholder)
    ?.sub_departments?.find((s) => s.is_placeholder || true); // Get first sub of placeholder dept
  const placeholderSubDeptId = placeholderSubDept?.id;

  // Reorder: placeholder first, then other departments
  const orderedDepartments = [
    ...departments.filter((d) => d.is_placeholder),
    ...departments.filter((d) => !d.is_placeholder),
  ];

  // Users in the sub-department being edited
  const currentSubUsers = editingSubId
    ? users.filter((u) => {
        const assignments = u.sub_department_assignments || [];
        return assignments.some((a) => a.sub_department_id === editingSubId);
      })
    : [];

  const resetForms = () => {
    setAddDepartment(false);
    setEditingDepartmentId(null);
    setAddSubForDeptId(null);
    setEditingSubId(null);
    setAddGroupForSubId(null);
    setEditingGroupId(null);
    setSelectedUserIdsToAdd(new Set());
    setSelectedGroupMemberIds(new Set());
    setDeptName("");
    setDeptDescription("");
    setDeptProfileImg("");
    setDeptLocation("");
    setSubName("");
    setSubDescription("");
    setGroupName("");
    setGroupDescription("");
    setSubProfileImg("");
    setSubLocation("");
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

  const toggleGroupMember = (userId) => {
    setSelectedGroupMemberIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const handleCreateGroup = async (e, subDeptId) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/groups`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          sub_department_id: subDeptId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Tạo tổ thất bại");
      }
      const created = await res.json();
      if (selectedGroupMemberIds.size > 0) {
        const memberRes = await fetch(`${API}/groups/${created.id}/members`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ user_ids: [...selectedGroupMemberIds] }),
        });
        if (!memberRes.ok) {
          const data = await memberRes.json();
          throw new Error(data.detail || "Thêm thành viên tổ thất bại");
        }
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

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/groups/${editingGroupId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Cập nhật tổ thất bại");
      }
      const memberRes = await fetch(`${API}/groups/${editingGroupId}/members`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ user_ids: [...selectedGroupMemberIds] }),
      });
      if (!memberRes.ok) {
        const data = await memberRes.json();
        throw new Error(data.detail || "Cập nhật thành viên tổ thất bại");
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

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Xóa tổ "${group.name}"?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/groups/${group.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Xóa tổ thất bại");
      }
      await fetchDepartments();
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEditGroup = (group, subDeptUsers) => {
    resetForms();
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setGroupDescription(group.description || "");
    const currentMemberIds = new Set(
      subDeptUsers
        .filter((u) =>
          (u.group_assignments || []).some((ga) => ga.group_id === group.id),
        )
        .map((u) => u.id),
    );
    setSelectedGroupMemberIds(currentMemberIds);
  };

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
          location: deptLocation.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Tạo bộ phận thất bại");
      }
      const created = await res.json();
      // Note: Departments don't have direct users anymore in many-to-many model
      // Users are assigned to sub-departments, not departments directly
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
      // Update department info
      const res = await fetch(`${API}/departments/${editingDepartmentId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          name: deptName.trim(),
          description: deptDescription.trim() || null,
          profile_img: deptProfileImg || null,
          location: deptLocation.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Cập nhật bộ phận thất bại");
      }

      // Note: In many-to-many model, users are assigned to sub-departments, not departments
      // User assignment is handled at the sub-department level

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
        `Xóa bộ phận "${dept.name}"? Các Phòng và người dùng sẽ được chuyển sang Chưa phân công.`,
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
        throw new Error(data.detail || "Xóa bộ phận thất bại");
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
          location: subLocation.trim() || null,
          department_id: parseInt(addSubForDeptId, 10),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Tạo Phòng thất bại");
      }
      const created = await res.json();
      if (selectedUserIdsToAdd.size > 0 && created.id) {
        // For each selected user, add this sub-department to their assignments
        const results = await Promise.all(
          [...selectedUserIdsToAdd].map(async (userId) => {
            // Get current user data to preserve existing assignments
            const userRes = await fetch(`${API}/users/${userId}`);
            if (!userRes.ok) return false;
            const userData = await userRes.json();

            // Build new assignments: existing non-placeholder + new one
            const existingAssignments = (
              userData.sub_department_assignments || []
            )
              .filter((a) => !a.is_placeholder)
              .map((a) => ({
                sub_department_id: a.sub_department_id,
                position: a.position,
              }));

            const newAssignments = [
              ...existingAssignments,
              { sub_department_id: created.id, position: null },
            ];

            const updateRes = await fetch(`${API}/users/${userId}`, {
              method: "PUT",
              headers: authHeaders(),
              body: JSON.stringify({
                sub_department_assignments: newAssignments,
              }),
            });
            return updateRes.ok;
          }),
        );
        if (results.some((ok) => !ok))
          throw new Error("Không thể thêm một số người dùng vào Phòng mới");
      }
      await fetchDepartments();
      onSaved?.();
      setAddSubForDeptId(null);
      setSubName("");
      setSubDescription("");
      setSubProfileImg("");
      setSubLocation("");
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
      // Update sub-department info
      const res = await fetch(`${API}/sub-departments/${editingSubId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          name: subName.trim(),
          description: subDescription.trim() || null,
          profile_img: subProfileImg || null,
          location: subLocation.trim() || null,
          department_id: subDepartmentId
            ? parseInt(subDepartmentId, 10)
            : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Cập nhật Phòng thất bại");
      }

      // Update user assignments using many-to-many model
      if (placeholderSubDeptId) {
        const currentIds = users
          .filter((u) => {
            const assignments = u.sub_department_assignments || [];
            return assignments.some(
              (a) => a.sub_department_id === editingSubId,
            );
          })
          .map((u) => u.id);
        const toUnassign = currentIds.filter(
          (id) => !selectedUserIdsToAdd.has(id),
        );
        const toAssign = [...selectedUserIdsToAdd].filter(
          (id) => !currentIds.includes(id),
        );

        // Assign users: add this sub-department to their assignments
        const assignResults = await Promise.all(
          toAssign.map(async (userId) => {
            const userRes = await fetch(`${API}/users/${userId}`);
            if (!userRes.ok) return false;
            const userData = await userRes.json();

            const existingAssignments = (
              userData.sub_department_assignments || []
            )
              .filter((a) => !a.is_placeholder)
              .map((a) => ({
                sub_department_id: a.sub_department_id,
                position: a.position,
              }));

            const newAssignments = [
              ...existingAssignments,
              { sub_department_id: editingSubId, position: null },
            ];

            const updateRes = await fetch(`${API}/users/${userId}`, {
              method: "PUT",
              headers: authHeaders(),
              body: JSON.stringify({
                sub_department_assignments: newAssignments,
              }),
            });
            return updateRes.ok;
          }),
        );

        // Unassign users: remove this sub-department from their assignments
        const unassignResults = await Promise.all(
          toUnassign.map(async (userId) => {
            const userRes = await fetch(`${API}/users/${userId}`);
            if (!userRes.ok) return false;
            const userData = await userRes.json();

            // Remove this sub-department from assignments
            const remainingAssignments = (
              userData.sub_department_assignments || []
            )
              .filter(
                (a) =>
                  !a.is_placeholder && a.sub_department_id !== editingSubId,
              )
              .map((a) => ({
                sub_department_id: a.sub_department_id,
                position: a.position,
              }));

            // If no assignments left, add to placeholder
            const newAssignments =
              remainingAssignments.length > 0
                ? remainingAssignments
                : [{ sub_department_id: placeholderSubDeptId, position: null }];

            const updateRes = await fetch(`${API}/users/${userId}`, {
              method: "PUT",
              headers: authHeaders(),
              body: JSON.stringify({
                sub_department_assignments: newAssignments,
              }),
            });
            return updateRes.ok;
          }),
        );

        if (assignResults.some((ok) => !ok))
          throw new Error("Không thể gán một số người dùng");
        if (unassignResults.some((ok) => !ok))
          throw new Error("Không thể bỏ gán một số người dùng");
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
        `Xóa Phòng "${sub.name}" (${deptName})? Người dùng sẽ được chuyển sang Chưa phân công.`,
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
        throw new Error(data.detail || "Xóa Phòng thất bại");
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
    setDeptLocation(dept.location || "");
    // In many-to-many model, departments don't have direct users
    // Users are assigned to sub-departments
    setSelectedUserIdsToAdd(new Set());
  };

  const startEditSub = (sub) => {
    if (sub.is_placeholder) return;
    setEditingSubId(sub.id);
    setSubName(sub.name);
    setSubDescription(sub.description || "");
    setSubProfileImg(sub.profile_img || "");
    setSubLocation(sub.location || "");
    setSubDepartmentId(String(sub.department_id));
    // Get users assigned to this sub-department
    const currentIds = users
      .filter((u) => {
        const assignments = u.sub_department_assignments || [];
        return assignments.some((a) => a.sub_department_id === sub.id);
      })
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

  // Get non-placeholder departments for reordering
  const reorderableDepartments = departments.filter((d) => !d.is_placeholder);

  // Drag and drop state
  const [draggedDeptId, setDraggedDeptId] = useState(null);
  const [dropIndicator, setDropIndicator] = useState(null); // { deptId, position: 'before' | 'after' }
  const dragImageRef = useRef(null);

  const handleDragStart = (e, deptId) => {
    setDraggedDeptId(deptId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", deptId);

    // Create a custom drag image from the card
    const card = e.target.closest(".manage-dept-card");
    if (card) {
      // Clone the card for the drag image
      const clone = card.cloneNode(true);
      clone.style.position = "absolute";
      clone.style.top = "-9999px";
      clone.style.left = "-9999px";
      clone.style.width = card.offsetWidth + "px";
      clone.style.opacity = "0.9";
      clone.style.transform = "rotate(2deg)";
      clone.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
      clone.classList.remove("dragging", "drag-over");
      document.body.appendChild(clone);
      dragImageRef.current = clone;

      // Set the clone as drag image
      const rect = card.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      e.dataTransfer.setDragImage(clone, offsetX, offsetY);

      // Mark original card as dragging after a brief delay
      setTimeout(() => {
        card.classList.add("dragging");
      }, 0);
    }
  };

  const handleDragEnd = (e) => {
    e.target.closest(".manage-dept-card")?.classList.remove("dragging");
    setDraggedDeptId(null);
    setDropIndicator(null);

    // Clean up the cloned drag image
    if (dragImageRef.current) {
      document.body.removeChild(dragImageRef.current);
      dragImageRef.current = null;
    }
  };

  const handleDragOver = (e, deptId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (deptId === draggedDeptId) {
      setDropIndicator(null);
      return;
    }

    // Determine if cursor is in top or bottom half of the card
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? "before" : "after";

    setDropIndicator({ deptId, position });
  };

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the card entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropIndicator(null);
    }
  };

  const handleDrop = async (e, targetDeptId) => {
    e.preventDefault();

    const currentIndicator = dropIndicator;
    setDropIndicator(null);

    if (!draggedDeptId || !currentIndicator) return;

    const draggedIndex = reorderableDepartments.findIndex(
      (d) => d.id === draggedDeptId,
    );
    let targetIndex = reorderableDepartments.findIndex(
      (d) => d.id === currentIndicator.deptId,
    );

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Adjust target index based on drop position
    if (currentIndicator.position === "after") {
      targetIndex += 1;
    }

    // Adjust if dragging from before the target
    if (draggedIndex < targetIndex) {
      targetIndex -= 1;
    }

    if (draggedIndex === targetIndex) return;

    // Create new order
    const newOrder = [...reorderableDepartments];
    const [moved] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, moved);

    // Update local state immediately for responsiveness
    const placeholderDept = departments.find((d) => d.is_placeholder);
    setDepartments(placeholderDept ? [...newOrder, placeholderDept] : newOrder);

    // Save to backend
    try {
      const res = await fetch(`${API}/departments/reorder`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ department_ids: newOrder.map((d) => d.id) }),
      });
      if (!res.ok) {
        throw new Error("Không thể sắp xếp lại bộ phận");
      }
      onSaved?.();
    } catch (err) {
      setError(err.message);
      // Revert on error
      await fetchDepartments();
    }

    setDraggedDeptId(null);
  };

  const isAdmin = !!token;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content manage-departments-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="manage-dept-modal-header">
          <h2>Bộ phận &amp; Phòng</h2>
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
                    <label>Vị trí</label>
                    <input
                      type="text"
                      value={deptLocation}
                      onChange={(e) => setDeptLocation(e.target.value)}
                      placeholder="VD: Tầng 3 - Phòng 301"
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
                + Thêm bộ phận
              </button>
            )}

            {orderedDepartments.map((dept) => (
              <div key={dept.id} className="manage-dept-card-wrapper">
                {/* Drop indicator before */}
                {dropIndicator?.deptId === dept.id &&
                  dropIndicator?.position === "before" && (
                    <div className="drop-indicator" />
                  )}
                <div
                  className={`manage-dept-card${draggedDeptId === dept.id ? " dragging" : ""}`}
                  onDragOver={
                    isAdmin && !dept.is_placeholder
                      ? (e) => handleDragOver(e, dept.id)
                      : undefined
                  }
                  onDragLeave={
                    isAdmin && !dept.is_placeholder
                      ? handleDragLeave
                      : undefined
                  }
                  onDrop={
                    isAdmin && !dept.is_placeholder
                      ? (e) => handleDrop(e, dept.id)
                      : undefined
                  }
                >
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
                          <label>Vị trí</label>
                          <input
                            type="text"
                            value={deptLocation}
                            onChange={(e) => setDeptLocation(e.target.value)}
                            placeholder="VD: Tầng 3 - Phòng 301"
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
                    </div>
                  ) : (
                    <div className="manage-dept-row">
                      {isAdmin && !dept.is_placeholder && (
                        <div
                          className="manage-dept-drag-handle"
                          draggable
                          onDragStart={(e) => handleDragStart(e, dept.id)}
                          onDragEnd={handleDragEnd}
                          title="Kéo để sắp xếp lại"
                        >
                          <span className="drag-handle-icon">⋮⋮</span>
                        </div>
                      )}
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
                          <label>Tên Phòng *</label>
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
                          <label>Vị trí</label>
                          <input
                            type="text"
                            value={subLocation}
                            onChange={(e) => setSubLocation(e.target.value)}
                            placeholder="VD: Tầng 3 - Phòng 301"
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
                        + Thêm
                      </button>
                    )}

                  <ul className="manage-sub-list">
                    {(dept.sub_departments || []).map((sub) => {
                      const subGroups = groups.filter(
                        (g) => g.sub_department_id === sub.id,
                      );
                      const subDeptUsers = users.filter((u) =>
                        (u.sub_department_assignments || []).some(
                          (a) => a.sub_department_id === sub.id,
                        ),
                      );
                      return (
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
                                  <label>Vị trí</label>
                                  <input
                                    type="text"
                                    value={subLocation}
                                    onChange={(e) =>
                                      setSubLocation(e.target.value)
                                    }
                                    placeholder="VD: Tầng 3 - Phòng 301"
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
                                  <label>Bộ phận</label>
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
                                                      {displayName !==
                                                        u.username && u.username
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
                                      {currentSubUsers.length > 0 && (
                                        <>
                                          <p className="manage-dept-user-group-label">
                                            Hiện đang trong{" "}
                                            {subName || sub.name}
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
                                                      {displayName !==
                                                        u.username && u.username
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
                                    </div>
                                  )}
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

                          {!sub.is_placeholder && (
                            <div className="manage-group-section">
                              {addGroupForSubId === sub.id && (
                                <div className="manage-group-form">
                                  <form
                                    onSubmit={(e) =>
                                      handleCreateGroup(e, sub.id)
                                    }
                                  >
                                    <div className="form-group">
                                      <label>Tên tổ *</label>
                                      <input
                                        type="text"
                                        value={groupName}
                                        onChange={(e) =>
                                          setGroupName(e.target.value)
                                        }
                                        required
                                        autoFocus
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>Mô tả</label>
                                      <input
                                        type="text"
                                        value={groupDescription}
                                        onChange={(e) =>
                                          setGroupDescription(e.target.value)
                                        }
                                      />
                                    </div>
                                    {subDeptUsers.length > 0 && (
                                      <div className="form-group">
                                        <label>Thành viên</label>
                                        <ul className="unassigned-users-list">
                                          {subDeptUsers.map((u) => {
                                            const displayName =
                                              [u.first_name, u.last_name]
                                                .filter(Boolean)
                                                .join(" ") || u.email;
                                            return (
                                              <li key={u.id}>
                                                <label className="unassigned-user-row">
                                                  <input
                                                    type="checkbox"
                                                    checked={selectedGroupMemberIds.has(
                                                      u.id,
                                                    )}
                                                    onChange={() =>
                                                      toggleGroupMember(u.id)
                                                    }
                                                  />
                                                  <span>{displayName}</span>
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
                                        onClick={() =>
                                          setAddGroupForSubId(null)
                                        }
                                      >
                                        Hủy
                                      </button>
                                      <button
                                        type="submit"
                                        className="btn-save"
                                        disabled={saving || !groupName.trim()}
                                      >
                                        {saving ? "Đang lưu..." : "Tạo tổ"}
                                      </button>
                                    </div>
                                  </form>
                                </div>
                              )}

                              {subGroups.length > 0 && (
                                <ul className="manage-group-list">
                                  {subGroups.map((group) => (
                                    <li key={group.id}>
                                      {editingGroupId === group.id ? (
                                        <div className="manage-group-form-inline">
                                          <form onSubmit={handleUpdateGroup}>
                                            <div className="form-group">
                                              <label>Tên tổ *</label>
                                              <input
                                                type="text"
                                                value={groupName}
                                                onChange={(e) =>
                                                  setGroupName(e.target.value)
                                                }
                                                required
                                                autoFocus
                                              />
                                            </div>
                                            <div className="form-group">
                                              <label>Mô tả</label>
                                              <input
                                                type="text"
                                                value={groupDescription}
                                                onChange={(e) =>
                                                  setGroupDescription(
                                                    e.target.value,
                                                  )
                                                }
                                              />
                                            </div>
                                            {subDeptUsers.length > 0 && (
                                              <div className="form-group">
                                                <label>Thành viên</label>
                                                <ul className="unassigned-users-list">
                                                  {subDeptUsers.map((u) => {
                                                    const displayName =
                                                      [
                                                        u.first_name,
                                                        u.last_name,
                                                      ]
                                                        .filter(Boolean)
                                                        .join(" ") || u.email;
                                                    return (
                                                      <li key={u.id}>
                                                        <label className="unassigned-user-row">
                                                          <input
                                                            type="checkbox"
                                                            checked={selectedGroupMemberIds.has(
                                                              u.id,
                                                            )}
                                                            onChange={() =>
                                                              toggleGroupMember(
                                                                u.id,
                                                              )
                                                            }
                                                          />
                                                          <span>
                                                            {displayName}
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
                                                onClick={() =>
                                                  setEditingGroupId(null)
                                                }
                                              >
                                                Hủy
                                              </button>
                                              <button
                                                type="submit"
                                                className="btn-save"
                                                disabled={
                                                  saving || !groupName.trim()
                                                }
                                              >
                                                {saving ? "Đang lưu..." : "Lưu"}
                                              </button>
                                            </div>
                                          </form>
                                        </div>
                                      ) : (
                                        <div className="manage-group-row">
                                          <span className="manage-group-name">
                                            ⸺ {group.name}
                                          </span>
                                          <span className="manage-group-count">
                                            {group.user_count} người
                                          </span>
                                          {isAdmin && (
                                            <span className="manage-group-actions">
                                              <button
                                                type="button"
                                                className="btn-edit"
                                                onClick={() =>
                                                  startEditGroup(
                                                    group,
                                                    subDeptUsers,
                                                  )
                                                }
                                              >
                                                Chỉnh sửa
                                              </button>
                                              <button
                                                type="button"
                                                className="btn-delete"
                                                onClick={() =>
                                                  handleDeleteGroup(group)
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
                              )}

                              {isAdmin &&
                                addGroupForSubId !== sub.id &&
                                editingGroupId == null && (
                                  <button
                                    type="button"
                                    className="btn-add-group"
                                    onClick={() => {
                                      resetForms();
                                      setAddGroupForSubId(sub.id);
                                      setSelectedGroupMemberIds(new Set());
                                    }}
                                  >
                                    + Thêm tổ
                                  </button>
                                )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                {/* Drop indicator after */}
                {dropIndicator?.deptId === dept.id &&
                  dropIndicator?.position === "after" && (
                    <div className="drop-indicator" />
                  )}
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
