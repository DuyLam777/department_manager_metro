import { useState, useEffect } from "react";
import "./DeletedItemsModal.css";

const authHeaders = (token) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export function DeletedItemsModal({
  token,
  onClose,
  onRestoreUser,
  onRestoreDepartment,
  onRestoreSubDepartment,
}) {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDeletedItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, deptsRes, subsRes] = await Promise.all([
        fetch("/api/users/deleted/list", { headers: authHeaders(token) }),
        fetch("/api/departments/deleted/list", { headers: authHeaders(token) }),
        fetch("/api/sub-departments/deleted/list", {
          headers: authHeaders(token),
        }),
      ]);
      if (!usersRes.ok)
        throw new Error("Tải danh sách người dùng đã xóa thất bại");
      if (!deptsRes.ok)
        throw new Error("Tải danh sách bộ phận đã xóa thất bại");
      if (!subsRes.ok) throw new Error("Tải danh sách Phòng đã xóa thất bại");
      const [usersData, deptsData, subsData] = await Promise.all([
        usersRes.json(),
        deptsRes.json(),
        subsRes.json(),
      ]);
      setUsers(usersData);
      setDepartments(deptsData);
      setSubDepartments(subsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedItems();
  }, []);

  const handleRestoreUser = async (userId, username) => {
    if (!confirm(`Khôi phục người dùng "${username}"?`)) return;
    setActionLoading(`user-${userId}`);
    try {
      const response = await fetch(`/api/users/${userId}/restore`, {
        method: "POST",
        headers: authHeaders(token),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Khôi phục người dùng thất bại");
      }
      const result = await response.json();
      setUsers(users.filter((u) => u.id !== userId));
      onRestoreUser?.(result.user);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreDepartment = async (deptId, name) => {
    if (!confirm(`Khôi phục bộ phận "${name}"?`)) return;
    setActionLoading(`dept-${deptId}`);
    try {
      const response = await fetch(`/api/departments/${deptId}/restore`, {
        method: "POST",
        headers: authHeaders(token),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Khôi phục bộ phận thất bại");
      }
      setDepartments(departments.filter((d) => d.id !== deptId));
      onRestoreDepartment?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreSubDepartment = async (subId, name) => {
    if (!confirm(`Khôi phục Phòng "${name}"?`)) return;
    setActionLoading(`sub-${subId}`);
    try {
      const response = await fetch(`/api/sub-departments/${subId}/restore`, {
        method: "POST",
        headers: authHeaders(token),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Khôi phục Phòng thất bại");
      }
      setSubDepartments(subDepartments.filter((s) => s.id !== subId));
      onRestoreSubDepartment?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDeleteUser = async (userId, username) => {
    if (
      !confirm(
        `Bạn có chắc muốn XÓA VĨNH VIỄN "${username}"? Hành động này không thể phục hồi!`,
      )
    )
      return;
    setActionLoading(`user-${userId}`);
    try {
      const response = await fetch(`/api/users/${userId}/permanent`, {
        method: "DELETE",
        headers: authHeaders(token),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Xóa người dùng thất bại");
      }
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDeleteDepartment = async (deptId, name) => {
    if (
      !confirm(
        `Bạn có chắc muốn XÓA VĨNH VIỄN bộ phận "${name}"? Hành động này không thể phục hồi!`,
      )
    )
      return;
    setActionLoading(`dept-${deptId}`);
    try {
      const response = await fetch(`/api/departments/${deptId}/permanent`, {
        method: "DELETE",
        headers: authHeaders(token),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Xóa bộ phận thất bại");
      }
      setDepartments(departments.filter((d) => d.id !== deptId));
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDeleteSubDepartment = async (subId, name) => {
    if (
      !confirm(
        `Bạn có chắc muốn XÓA VĨNH VIỄN Phòng "${name}"? Hành động này không thể phục hồi!`,
      )
    )
      return;
    setActionLoading(`sub-${subId}`);
    try {
      const response = await fetch(`/api/sub-departments/${subId}/permanent`, {
        method: "DELETE",
        headers: authHeaders(token),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Xóa Phòng thất bại");
      }
      setSubDepartments(subDepartments.filter((s) => s.id !== subId));
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanupOldDeletedUsers = async () => {
    if (
      !confirm("Xóa vĩnh viễn tất cả người dùng đã bị xóa hơn 30 ngày trước?")
    )
      return;
    setActionLoading("cleanup");
    try {
      const response = await fetch("/api/users/deleted/cleanup?days=30", {
        method: "DELETE",
        headers: authHeaders(token),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Dọn dẹp thất bại");
      }
      const result = await response.json();
      alert(result.message);
      fetchDeletedItems();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getDisplayName = (u) => {
    if (u.first_name || u.last_name) {
      return `${u.first_name || ""} ${u.last_name || ""}`.trim();
    }
    return u.username;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Không rõ";
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getDaysAgo = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = now - date;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content deleted-items-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="deleted-items-modal-header">
          <h2>Mục đã xóa</h2>
          <button
            type="button"
            className="deleted-items-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            &times;
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        {loading ? (
          <p className="loading-text">Đang tải...</p>
        ) : (
          <div className="deleted-items-modal-body">
            {/* Deleted Users section */}
            <section className="deleted-section">
              <div className="deleted-section-header">
                <h3>Người dùng đã xóa</h3>
                <span className="deleted-section-count">
                  {users.length} người{users.length !== 1 ? "" : ""}
                </span>
                <button
                  type="button"
                  className="btn-cleanup"
                  onClick={handleCleanupOldDeletedUsers}
                  disabled={actionLoading === "cleanup" || users.length === 0}
                >
                  {actionLoading === "cleanup"
                    ? "Đang dọn dẹp..."
                    : "Dọn dẹp 30+ ngày"}
                </button>
              </div>
              {users.length === 0 ? (
                <p className="empty-text">Không có người dùng đã xóa</p>
              ) : (
                <div className="deleted-users-list">
                  {users.map((u) => {
                    const daysAgo = getDaysAgo(u.deleted_at);
                    return (
                      <div key={u.id} className="deleted-user-row">
                        <div className="user-info">
                          <img
                            src={
                              u.profile_img ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName(u))}&background=6b7280&color=fff&size=40`
                            }
                            alt={getDisplayName(u)}
                            className="user-avatar-small"
                          />
                          <div className="user-details">
                            <div className="user-name">{getDisplayName(u)}</div>
                            <div className="user-meta">
                              @{u.username} •{" "}
                              {u.department || "Không có bộ phận"}
                            </div>
                            <div className="deleted-info">
                              Đã xóa: {formatDate(u.deleted_at)}
                              {daysAgo !== null && (
                                <span
                                  className={
                                    daysAgo >= 30 ? "days-warning" : ""
                                  }
                                >
                                  {" "}
                                  ({daysAgo} ngày trước)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="user-actions">
                          <button
                            type="button"
                            className="btn-restore"
                            onClick={() =>
                              handleRestoreUser(u.id, getDisplayName(u))
                            }
                            disabled={actionLoading === `user-${u.id}`}
                          >
                            {actionLoading === `user-${u.id}`
                              ? "..."
                              : "Khôi phục"}
                          </button>
                          <button
                            type="button"
                            className="btn-perma-delete"
                            onClick={() =>
                              handlePermanentDeleteUser(u.id, getDisplayName(u))
                            }
                            disabled={actionLoading === `user-${u.id}`}
                          >
                            Xóa vĩnh viễn
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Deleted Departments section */}
            <section className="deleted-section">
              <div className="deleted-section-header">
                <h3>Bộ phận đã xóa</h3>
                <span className="deleted-section-count">
                  {departments.length} bộ phận
                  {departments.length !== 1 ? "" : ""}
                </span>
              </div>
              {departments.length === 0 ? (
                <p className="empty-text">Không có bộ phận đã xóa</p>
              ) : (
                <ul className="deleted-dept-list">
                  {departments.map((d) => (
                    <li key={d.id} className="deleted-dept-row">
                      <div className="deleted-dept-info">
                        <span className="deleted-dept-name">{d.name}</span>
                        {d.description && (
                          <span className="deleted-dept-desc">
                            {d.description}
                          </span>
                        )}
                        <span className="deleted-dept-date">
                          Đã xóa: {formatDate(d.deleted_at)}
                        </span>
                      </div>
                      <div className="dept-actions">
                        <button
                          type="button"
                          className="btn-restore"
                          onClick={() => handleRestoreDepartment(d.id, d.name)}
                          disabled={actionLoading === `dept-${d.id}`}
                        >
                          {actionLoading === `dept-${d.id}`
                            ? "..."
                            : "Khôi phục"}
                        </button>
                        <button
                          type="button"
                          className="btn-perma-delete"
                          onClick={() =>
                            handlePermanentDeleteDepartment(d.id, d.name)
                          }
                          disabled={actionLoading === `dept-${d.id}`}
                        >
                          Xóa vĩnh viễn
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Deleted Sub-departments section */}
            <section className="deleted-section">
              <div className="deleted-section-header">
                <h3>Phòng đã xóa</h3>
                <span className="deleted-section-count">
                  {subDepartments.length} Phòng
                  {subDepartments.length !== 1 ? "" : ""}
                </span>
              </div>
              {subDepartments.length === 0 ? (
                <p className="empty-text">Không có Phòng đã xóa</p>
              ) : (
                <ul className="deleted-dept-list">
                  {subDepartments.map((s) => (
                    <li key={s.id} className="deleted-dept-row">
                      <div className="deleted-dept-info">
                        <span className="deleted-dept-name">— {s.name}</span>
                        {s.department_name && (
                          <span className="deleted-dept-desc">
                            ({s.department_name})
                          </span>
                        )}
                        <span className="deleted-dept-date">
                          Đã xóa: {formatDate(s.deleted_at)}
                        </span>
                      </div>
                      <div className="dept-actions">
                        <button
                          type="button"
                          className="btn-restore"
                          onClick={() =>
                            handleRestoreSubDepartment(s.id, s.name)
                          }
                          disabled={actionLoading === `sub-${s.id}`}
                        >
                          {actionLoading === `sub-${s.id}`
                            ? "..."
                            : "Khôi phục"}
                        </button>
                        <button
                          type="button"
                          className="btn-perma-delete"
                          onClick={() =>
                            handlePermanentDeleteSubDepartment(s.id, s.name)
                          }
                          disabled={actionLoading === `sub-${s.id}`}
                        >
                          Xóa vĩnh viễn
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
