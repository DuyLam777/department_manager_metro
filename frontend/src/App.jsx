import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { Header } from "./components/Header";
import { LoginModal } from "./components/LoginModal";
import { UserDetailModal } from "./components/UserDetailModal";
import { AddUserModal } from "./components/AddUserModal";
import { DeletedItemsModal } from "./components/DeletedItemsModal";
import { ManageDepartmentsModal } from "./components/ManageDepartmentsModal";
import { SettingsModal } from "./components/SettingsModal";
import "./App.css";

function App() {
  const { user, loading: authLoading, login, logout, getToken } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  // { type: 'department', id, name } | { type: 'sub', id, name, departmentName } | null (all)
  const [selectedFilter, setSelectedFilter] = useState(null);
  // Department dropdowns: closed by default. Set of department ids that are expanded.
  const [expandedDepartmentIds, setExpandedDepartmentIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usersError, setUsersError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showDeletedItemsModal, setShowDeletedItemsModal] = useState(false);
  const [showManageDepartmentsModal, setShowManageDepartmentsModal] =
    useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [appSettings, setAppSettings] = useState({
    app_title: "Phần mềm quản lý nhân sự",
    header_banner_img: null,
    app_logo_img: null,
    main_bg_color: "#f3f4f6",
    sidebar_bg_color: "#1f2937",
  });

  // Remove Vietnamese diacritics for accent-insensitive search
  const removeVietnameseDiacritics = (str) => {
    if (!str) return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  };

  // Fuzzy match function - checks if query chars appear in order in target
  // Supports Vietnamese without accents (e.g., "nhan su" matches "Nhân sự")
  const fuzzyMatch = (query, target) => {
    if (!query) return true;
    if (!target) return false;

    const q = removeVietnameseDiacritics(query.toLowerCase());
    const t = removeVietnameseDiacritics(target.toLowerCase());

    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) qi++;
    }
    return qi === q.length;
  };

  // Fuzzy filter departments/sub-departments by name for sidebar
  const departmentMatchesSearch = (dept) => {
    if (!departmentSearchQuery.trim()) return true;
    if (fuzzyMatch(departmentSearchQuery, dept.name)) return true;
    return (dept.sub_departments || []).some((sub) =>
      fuzzyMatch(departmentSearchQuery, sub.name),
    );
  };
  // Reorder: Chưa phân công (placeholder) first, then other departments
  const reorderedDepartments = [
    ...departments.filter((d) => d.is_placeholder),
    ...departments.filter((d) => !d.is_placeholder),
  ];
  const filteredDepartments = reorderedDepartments.filter(
    departmentMatchesSearch,
  );

  // Check if user matches search query
  const matchesSearch = (u) => {
    if (!searchQuery.trim()) return true;

    const searchFields = [
      u.first_name,
      u.last_name,
      `${u.first_name || ""} ${u.last_name || ""}`,
      u.username,
      u.email,
    ];

    return searchFields.some((field) => fuzzyMatch(searchQuery, field));
  };

  useEffect(() => {
    fetchDepartments();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setAppSettings(data);
      }
    } catch {
      // use defaults
    }
  };

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/departments");
      if (!res.ok) throw new Error("Failed to fetch departments");
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersForFilter = async (filter) => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      let url = "/api/users";
      if (filter?.type === "department") {
        url += `?department_id=${filter.id}`;
      } else if (filter?.type === "sub") {
        url += `?sub_department_id=${filter.id}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setUsersError(err.message);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // Auto-expand departments when search matches a sub-department name
  useEffect(() => {
    if (!departmentSearchQuery.trim()) return;
    const toExpand = new Set();
    departments.forEach((dept) => {
      const subMatches = (dept.sub_departments || []).some((sub) =>
        fuzzyMatch(departmentSearchQuery, sub.name),
      );
      if (subMatches) toExpand.add(dept.id);
    });
    if (toExpand.size > 0) {
      setExpandedDepartmentIds((prev) => new Set([...prev, ...toExpand]));
    }
  }, [departmentSearchQuery, departments]);

  const fetchData = async () => {
    await fetchDepartments();
    if (selectedFilter !== null) {
      await fetchUsersForFilter(selectedFilter);
    }
  };

  // Filter by department/sub_department or all, then by search query
  const filteredUsers = users
    .filter((u) => {
      if (!selectedFilter) return true;
      if (selectedFilter.type === "department") {
        // Prefer `effective_bo_phan` (Bộ phận) from backend; fall back to older fields if absent
        const userDeptName =
          u.effective_bo_phan ||
          u.effective_department ||
          u.bo_phan ||
          u.department;
        return userDeptName === selectedFilter.name;
      }
      if (selectedFilter.type === "sub") {
        return u.sub_department_id === selectedFilter.id;
      }
      return true;
    })
    .filter(matchesSearch);

  const handleUserUpdate = (updatedUser) => {
    setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
  };

  const handleUserCreated = () => {
    fetchUsersForFilter(selectedFilter);
  };

  const handleUserDelete = (userId) => {
    setUsers(users.filter((u) => u.id !== userId));
    fetchDepartments(); // Refresh department/sub-department user counts in sidebar
  };

  const handleUserRestore = () => {
    fetchUsersForFilter(selectedFilter);
  };

  // Get default department/sub for Add User when a filter is selected
  const getDefaultDepartmentId = () => {
    if (!selectedFilter) return null;
    if (selectedFilter.type === "department") return selectedFilter.id;
    return null;
  };
  const getDefaultSubDepartmentId = () => {
    if (selectedFilter?.type === "sub") return selectedFilter.id;
    return null;
  };

  // Helper to get display name
  const getDisplayName = (u) => {
    if (u.first_name || u.last_name) {
      return `${u.first_name || ""} ${u.last_name || ""}`.trim();
    }
    return u.username;
  };

  if (authLoading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="app-container">
      <Header
        user={user}
        appTitle={appSettings.app_title}
        appLogoImg={appSettings.app_logo_img}
        headerBannerImg={appSettings.header_banner_img}
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={logout}
        onSettingsClick={() => setShowSettingsModal(true)}
      />

      {showLoginModal && (
        <LoginModal onLogin={login} onClose={() => setShowLoginModal(false)} />
      )}

      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          departments={departments}
          isAdmin={user?.is_admin || false}
          token={getToken()}
          onClose={() => setSelectedUserId(null)}
          onUpdate={handleUserUpdate}
          onDelete={handleUserDelete}
        />
      )}

      {showAddUserModal && (
        <AddUserModal
          departments={departments}
          defaultDepartmentId={getDefaultDepartmentId()}
          defaultSubDepartmentId={getDefaultSubDepartmentId()}
          token={getToken()}
          onClose={() => setShowAddUserModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}

      {showDeletedItemsModal && (
        <DeletedItemsModal
          token={getToken()}
          onClose={() => setShowDeletedItemsModal(false)}
          onRestoreUser={handleUserRestore}
          onRestoreDepartment={fetchDepartments}
          onRestoreSubDepartment={fetchDepartments}
        />
      )}

      {showManageDepartmentsModal && (
        <ManageDepartmentsModal
          token={getToken()}
          onClose={() => setShowManageDepartmentsModal(false)}
          onSaved={fetchData}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          settings={appSettings}
          token={getToken()}
          isAdmin={user?.is_admin || false}
          onSave={(updated) => setAppSettings(updated)}
          onClose={() => setShowSettingsModal(false)}
          onDeletedItemsClick={() => setShowDeletedItemsModal(true)}
        />
      )}

      <div className="layout">
        <aside
          className="sidebar"
          style={{ backgroundColor: appSettings.sidebar_bg_color }}
        >
          <h2>Bộ phận</h2>
          <div className="sidebar-dept-search">
            <input
              type="text"
              placeholder="Tìm bộ phận..."
              value={departmentSearchQuery}
              onChange={(e) => setDepartmentSearchQuery(e.target.value)}
              className="sidebar-search-input"
            />
            {departmentSearchQuery && (
              <button
                type="button"
                className="sidebar-search-clear"
                onClick={() => setDepartmentSearchQuery("")}
                aria-label="Xóa"
              >
                &times;
              </button>
            )}
          </div>
          <ul className="department-list">
            <li>
              <div
                className={`department-item ${!selectedFilter ? "active" : ""}`}
                onClick={() => setSelectedFilter(null)}
              >
                Tất cả bộ phận
                <span className="user-count">
                  {departments.reduce((sum, d) => sum + (d.user_count ?? 0), 0)}
                </span>
              </div>
            </li>
            {filteredDepartments.map((dept) => {
              const isExpanded = expandedDepartmentIds.has(dept.id);
              const hasSubDepts = (dept.sub_departments?.length ?? 0) > 0;
              const isDeptSelected =
                selectedFilter?.type === "department" &&
                selectedFilter?.id === dept.id;
              return (
                <li key={`dept-${dept.id}`}>
                  <div
                    className={`department-item department-dropdown-trigger ${hasSubDepts ? "has-children" : ""} ${isExpanded ? "expanded" : ""} ${isDeptSelected ? "active" : ""}`}
                    onClick={() => {
                      setSelectedFilter({
                        type: "department",
                        id: dept.id,
                        name: dept.name,
                        location: dept.location,
                      });
                      fetchUsersForFilter({
                        type: "department",
                        id: dept.id,
                        name: dept.name,
                      });
                      if (hasSubDepts) {
                        setExpandedDepartmentIds((prev) => {
                          const next = new Set(prev);
                          if (!next.has(dept.id)) next.add(dept.id);
                          return next;
                        });
                      }
                    }}
                  >
                    <span className="department-label">
                      {hasSubDepts && (
                        <span
                          className="department-chevron"
                          aria-hidden
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDepartmentIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(dept.id)) {
                                next.delete(dept.id);
                              } else {
                                next.add(dept.id);
                              }
                              return next;
                            });
                          }}
                        >
                          {isExpanded ? "▼" : "▶"}
                        </span>
                      )}
                      {dept.name}
                    </span>
                    <span className="user-count">{dept.user_count ?? 0}</span>
                  </div>
                  {hasSubDepts && (
                    <ul
                      className={`sub-department-list ${isExpanded ? "is-open" : ""}`}
                    >
                      {dept.sub_departments.map((sub) => (
                        <li
                          key={`sub-${sub.id}`}
                          className={
                            selectedFilter?.type === "sub" &&
                            selectedFilter?.id === sub.id
                              ? "active"
                              : ""
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            const filter = {
                              type: "sub",
                              id: sub.id,
                              name: sub.name,
                              location: sub.location,
                            };
                            setSelectedFilter(filter);
                            fetchUsersForFilter(filter);
                          }}
                        >
                          {sub.name}
                          <span className="user-count">
                            {sub.user_count ?? 0}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          {user?.is_admin && (
            <button
              type="button"
              className="sidebar-add-dept-btn"
              onClick={() => setShowManageDepartmentsModal(true)}
            >
              Quản lý bộ phận
            </button>
          )}
        </aside>

        <main
          className="main-content"
          style={{ backgroundColor: appSettings.main_bg_color }}
        >
          {loading ? (
            <p>Đang tải bộ phận...</p>
          ) : error ? (
            <p className="error-text">Lỗi: {error}</p>
          ) : !selectedFilter ? (
            <>
              <div className="content-header">
                <h1>Bộ phận &amp; Ban</h1>
              </div>
              <div className="departments-overview">
                {filteredDepartments.map((dept) => (
                  <div key={dept.id} className="department-overview-card">
                    <div
                      className="department-overview-header department-overview-clickable"
                      onClick={() => {
                        setSelectedFilter({
                          type: "department",
                          id: dept.id,
                          name: dept.name,
                          location: dept.location,
                        });
                        fetchUsersForFilter({
                          type: "department",
                          id: dept.id,
                          name: dept.name,
                        });
                        if ((dept.sub_departments?.length ?? 0) > 0) {
                          setExpandedDepartmentIds(
                            (prev) => new Set([...prev, dept.id]),
                          );
                        }
                      }}
                    >
                      <span className="department-overview-name">
                        {dept.name}
                      </span>
                      <span className="department-overview-count">
                        {dept.user_count ?? 0} người
                      </span>
                    </div>
                    {dept.description && (
                      <p className="department-overview-desc">
                        {dept.description}
                      </p>
                    )}
                    {(dept.sub_departments?.length ?? 0) > 0 && (
                      <ul className="department-overview-subs">
                        {dept.sub_departments.map((sub) => (
                          <li
                            key={sub.id}
                            className="department-overview-sub-clickable"
                            onClick={() => {
                              const filter = {
                                type: "sub",
                                id: sub.id,
                                name: sub.name,
                                location: sub.location,
                              };
                              setSelectedFilter(filter);
                              fetchUsersForFilter(filter);
                              setExpandedDepartmentIds(
                                (prev) => new Set([...prev, dept.id]),
                              );
                            }}
                          >
                            — {sub.name}
                            <span className="department-overview-sub-count">
                              {sub.user_count ?? 0} người
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="content-header">
                <h1>
                  {selectedFilter.location
                    ? `${selectedFilter.name} - ${selectedFilter.location}`
                    : selectedFilter.name}
                </h1>
                <div className="header-actions">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Tìm người dùng..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="search-clear"
                        onClick={() => setSearchQuery("")}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                  {user?.is_admin && (
                    <button
                      className="btn-add-user"
                      onClick={() => setShowAddUserModal(true)}
                    >
                      + Thêm người dùng
                    </button>
                  )}
                </div>
              </div>

              {usersLoading ? (
                <p className="no-users">Đang tải người dùng...</p>
              ) : usersError ? (
                <p className="error-text">Lỗi tải người dùng: {usersError}</p>
              ) : filteredUsers.length === 0 ? (
                <p className="no-users">Không tìm thấy người dùng</p>
              ) : (
                <div className="user-grid">
                  {filteredUsers.map((u) => {
                    const displayName = getDisplayName(u);
                    return (
                      <div
                        key={u.id}
                        className="user-card"
                        onClick={() => setSelectedUserId(u.id)}
                      >
                        <div className="user-avatar">
                          <img
                            src={
                              u.profile_img ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6b7280&color=fff&size=128`
                            }
                            alt={displayName}
                          />
                          {u.is_admin && (
                            <span className="admin-badge">Quản trị</span>
                          )}
                        </div>
                        <div className="user-name">{displayName}</div>

                        <div className="user-tooltip" style={{ zIndex: 9999 }}>
                          <div className="tooltip-row">
                            <span className="tooltip-label">Họ và tên:</span>
                            <span>{displayName}</span>
                          </div>

                          {user?.is_admin && (
                            <div className="tooltip-row">
                              <span className="tooltip-label">Email:</span>
                              <span>{u.email || "-"}</span>
                            </div>
                          )}

                          <div className="tooltip-row">
                            <span className="tooltip-label">Bộ phận:</span>
                            <span>
                              {u.sub_department
                                ? `${u.sub_department} (${u.effective_bo_phan ?? u.effective_department ?? u.department ?? u.bo_phan ?? "-"})`
                                : u.effective_bo_phan ||
                                  u.effective_department ||
                                  u.department ||
                                  u.bo_phan ||
                                  "-"}
                            </span>
                          </div>

                          <div className="tooltip-row">
                            <span className="tooltip-label">Chức vụ:</span>
                            <span>
                              {u.position ||
                                (u.is_admin ? "Quản trị viên" : "Người dùng")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
