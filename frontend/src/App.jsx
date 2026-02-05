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
  // Department dropdowns in the "All Departments" overview
  const [expandedOverviewDeptIds, setExpandedOverviewDeptIds] = useState(
    new Set(),
  );
  // All users for the overview search
  const [allUsers, setAllUsers] = useState([]);
  // Search query for the "All Departments" overview
  const [overviewSearchQuery, setOverviewSearchQuery] = useState("");
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  // Supports Vietnamese without accents (e.g., "nhan su" matches accented text)
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
  // Reorder: placeholder first, then other departments
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
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch all users");
      const data = await res.json();
      setAllUsers(data);
    } catch {
      // ignore - overview search will not work but app still functions
    }
  };

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
    await fetchAllUsers();
    if (selectedFilter !== null) {
      await fetchUsersForFilter(selectedFilter);
    }
  };

  // Filter by department/sub_department or all, then by search query
  const filteredUsers = users
    .filter((u) => {
      if (!selectedFilter) return true;
      if (selectedFilter.type === "department") {
        // Check if user has any assignment in this department
        const assignments = u.sub_department_assignments || [];
        return assignments.some(
          (a) => a.department_id === selectedFilter.id && !a.is_placeholder,
        );
      }
      if (selectedFilter.type === "sub") {
        // Check if user has an assignment in this sub-department
        const assignments = u.sub_department_assignments || [];
        return assignments.some(
          (a) => a.sub_department_id === selectedFilter.id,
        );
      }
      return true;
    })
    .filter(matchesSearch);

  const handleUserUpdate = (updatedUser) => {
    setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    setAllUsers(
      allUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
    );
  };

  const handleUserCreated = () => {
    fetchUsersForFilter(selectedFilter);
    fetchAllUsers();
    fetchDepartments();
  };

  const handleUserDelete = (userId) => {
    setUsers(users.filter((u) => u.id !== userId));
    setAllUsers(allUsers.filter((u) => u.id !== userId));
    fetchDepartments(); // Refresh department/sub-department user counts in sidebar
  };

  const handleUserRestore = () => {
    fetchUsersForFilter(selectedFilter);
    fetchAllUsers();
    fetchDepartments();
  };

  // Get default sub-department for Add User when a filter is selected
  const getDefaultSubDepartmentIds = () => {
    if (!selectedFilter) return [];
    if (selectedFilter.type === "sub") return [selectedFilter.id];
    return [];
  };

  // Helper to get display name (full name)
  const getDisplayName = (u) => {
    if (u.first_name || u.last_name) {
      return `${u.first_name || ""} ${u.last_name || ""}`.trim();
    }
    return u.username;
  };

  // Helper to get abbreviated name: first word of first_name + first word of last_name
  const getAbbreviatedName = (u) => {
    if (!u.first_name && !u.last_name) return u.username;
    const firstWord = (u.first_name || "").split(" ")[0] || "";
    const lastWord = (u.last_name || "").split(" ")[0] || "";
    return `${firstWord} ${lastWord}`.trim() || u.username;
  };

  // Helper to get hover name: last_name + first_name (Vietnamese style)
  const getHoverName = (u) => {
    if (!u.first_name && !u.last_name) return u.username;
    return `${u.last_name || ""} ${u.first_name || ""}`.trim() || u.username;
  };

  // Get user's position in a specific sub-department
  const getUserPositionInSubDept = (u, subDeptId) => {
    const assignments = u.sub_department_assignments || [];
    const assignment = assignments.find(
      (a) => a.sub_department_id === subDeptId,
    );
    return assignment?.position || null;
  };

  // Get user's department/position display for tooltip
  const getUserDepartmentDisplay = (u) => {
    const assignments = (u.sub_department_assignments || []).filter(
      (a) => !a.is_placeholder,
    );
    if (assignments.length === 0) {
      return { dept: "-", positions: [] };
    }
    if (assignments.length === 1) {
      const a = assignments[0];
      return {
        dept: a.sub_department_name
          ? `${a.sub_department_name} (${a.department_name || "-"})`
          : a.department_name || "-",
        positions: [{ subDept: a.sub_department_name, position: a.position }],
      };
    }
    // Multiple assignments
    return {
      dept: `${assignments.length} Phòng`,
      positions: assignments.map((a) => ({
        subDept: a.sub_department_name,
        deptName: a.department_name,
        position: a.position,
      })),
    };
  };

  // Get users for a specific department (users who have any assignment in its sub-departments)
  const getUsersForDepartment = (deptId) => {
    const dept = departments.find((d) => d.id === deptId);
    if (!dept) return [];
    const subDeptIds = (dept.sub_departments || []).map((s) => s.id);
    return allUsers.filter((u) => {
      const assignments = u.sub_department_assignments || [];
      return assignments.some((a) => subDeptIds.includes(a.sub_department_id));
    });
  };

  // Get users for a specific sub-department
  const getUsersForSubDepartment = (subDeptId) => {
    return allUsers.filter((u) => {
      const assignments = u.sub_department_assignments || [];
      return assignments.some((a) => a.sub_department_id === subDeptId);
    });
  };

  // Filter departments and users by overview search query
  // Returns results grouped by department and sub-department like the normal view
  const getOverviewSearchResults = () => {
    if (!overviewSearchQuery.trim()) return null;

    const results = [];
    const assignedDepts = departments.filter((d) => !d.is_placeholder);

    assignedDepts.forEach((dept) => {
      const subDeptResults = [];

      // Group matching users by sub-department
      (dept.sub_departments || []).forEach((sub) => {
        const subUsers = getUsersForSubDepartment(sub.id);
        const matchingUsers = subUsers.filter((u) => {
          const searchFields = [
            u.first_name,
            u.last_name,
            `${u.first_name || ""} ${u.last_name || ""}`,
            u.username,
          ];
          return searchFields.some((field) =>
            fuzzyMatch(overviewSearchQuery, field),
          );
        });

        if (matchingUsers.length > 0) {
          subDeptResults.push({
            subDepartment: sub,
            users: matchingUsers,
          });
        }
      });

      if (subDeptResults.length > 0) {
        results.push({
          department: dept,
          subDepartments: subDeptResults,
        });
      }
    });

    return results;
  };

  // Render user tooltip content
  const renderUserTooltip = (u, subDeptId = null) => {
    const hoverName = getHoverName(u);
    const deptInfo = getUserDepartmentDisplay(u);
    const positionToShow = subDeptId
      ? getUserPositionInSubDept(u, subDeptId)
      : u.position;

    return (
      <div className="user-tooltip">
        <div className="tooltip-row">
          <span className="tooltip-label">Họ và tên:</span>
          <span>{hoverName}</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Bộ phận:</span>
          <span>{deptInfo.dept}</span>
        </div>
        {deptInfo.positions.length > 1 ? (
          <div className="tooltip-row tooltip-positions">
            <span className="tooltip-label">Chức vụ:</span>
            <div className="tooltip-positions-list">
              {deptInfo.positions.map((p, idx) => (
                <div key={idx} className="tooltip-position-item">
                  <span className="tooltip-subdept">{p.subDept}:</span>
                  <span>{p.position || "Chưa có"}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="tooltip-row">
            <span className="tooltip-label">Chức vụ:</span>
            <span>
              {positionToShow || (u.is_admin ? "Quản trị viên" : "Người dùng")}
            </span>
          </div>
        )}
      </div>
    );
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
          currentUserId={user?.id}
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
          defaultSubDepartmentIds={getDefaultSubDepartmentIds()}
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
        {/* Mobile sidebar overlay */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? "active" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Mobile burger menu button */}
        <button
          type="button"
          className="burger-menu"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <span className="burger-line" />
          <span className="burger-line" />
          <span className="burger-line" />
        </button>

        <aside
          className={`sidebar ${sidebarOpen ? "open" : ""}`}
          style={{ backgroundColor: appSettings.sidebar_bg_color }}
        >
          <div className="sidebar-header">
            <h2>Bộ phận</h2>
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              &times;
            </button>
          </div>
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
                onClick={() => {
                  setSelectedFilter(null);
                  setSidebarOpen(false);
                }}
              >
                Tất cả bộ phận
                <span className="user-count">
                  {departments
                    .filter((d) => !d.is_placeholder)
                    .reduce((sum, d) => sum + (d.user_count ?? 0), 0)}
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
                      setSidebarOpen(false);
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
                            setSidebarOpen(false);
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
                <h1>Bộ phận &amp; Phòng</h1>
                <div className="header-actions">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Tìm người dùng..."
                      value={overviewSearchQuery}
                      onChange={(e) => setOverviewSearchQuery(e.target.value)}
                      className="search-input"
                    />
                    {overviewSearchQuery && (
                      <button
                        type="button"
                        className="search-clear"
                        onClick={() => setOverviewSearchQuery("")}
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

              {/* Search results view - grouped by department and sub-department */}
              {overviewSearchQuery.trim() ? (
                <div className="departments-overview">
                  {(() => {
                    const searchResults = getOverviewSearchResults();
                    if (!searchResults || searchResults.length === 0) {
                      return (
                        <p className="no-users">Không tìm thấy người dùng</p>
                      );
                    }
                    return searchResults.map(
                      ({ department, subDepartments }) => {
                        const totalResults = subDepartments.reduce(
                          (sum, sd) => sum + sd.users.length,
                          0,
                        );
                        return (
                          <div
                            key={department.id}
                            className="department-overview-card"
                          >
                            <div className="department-overview-header">
                              <span className="department-overview-name">
                                {department.name}
                              </span>
                              <span className="department-overview-count">
                                {totalResults} kết quả
                              </span>
                            </div>
                            <div className="overview-dropdown-content">
                              <div className="overview-sub-sections">
                                {subDepartments.map(
                                  ({ subDepartment, users }) => (
                                    <div
                                      key={subDepartment.id}
                                      className="overview-sub-section"
                                    >
                                      <div className="overview-sub-header">
                                        <span>— {subDepartment.name}</span>
                                        <span className="department-overview-sub-count">
                                          {users.length} kết quả
                                        </span>
                                      </div>
                                      <div className="user-grid overview-user-grid">
                                        {users.map((u) => {
                                          const abbreviatedName =
                                            getAbbreviatedName(u);
                                          return (
                                            <div
                                              key={u.id}
                                              className="user-card"
                                              onClick={() =>
                                                setSelectedUserId(u.id)
                                              }
                                            >
                                              <div className="user-avatar">
                                                <img
                                                  src={
                                                    u.profile_img ||
                                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(abbreviatedName)}&background=6b7280&color=fff&size=128`
                                                  }
                                                  alt={abbreviatedName}
                                                />
                                                {u.is_admin && (
                                                  <span className="admin-badge">
                                                    Quản trị
                                                  </span>
                                                )}
                                              </div>
                                              <div className="user-name">
                                                {abbreviatedName}
                                              </div>
                                              {renderUserTooltip(
                                                u,
                                                subDepartment.id,
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      },
                    );
                  })()}
                </div>
              ) : (
                /* Normal departments view with dropdowns */
                <div className="departments-overview">
                  {filteredDepartments
                    .filter((d) => !d.is_placeholder)
                    .map((dept) => {
                      const isExpanded = expandedOverviewDeptIds.has(dept.id);
                      const deptUsers = getUsersForDepartment(dept.id);
                      const hasSubDepts =
                        (dept.sub_departments?.length ?? 0) > 0;

                      return (
                        <div key={dept.id} className="department-overview-card">
                          <div
                            className="department-overview-header department-overview-clickable"
                            onClick={() => {
                              setExpandedOverviewDeptIds((prev) => {
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
                            <span className="department-overview-name">
                              <span className="overview-chevron">
                                {isExpanded ? "▼" : "▶"}
                              </span>
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

                          {/* Dropdown content - users */}
                          {isExpanded && (
                            <div className="overview-dropdown-content">
                              {/* Sub-departments with their users */}
                              {hasSubDepts && (
                                <div className="overview-sub-sections">
                                  {dept.sub_departments.map((sub) => {
                                    const subUsers = getUsersForSubDepartment(
                                      sub.id,
                                    );
                                    return (
                                      <div
                                        key={sub.id}
                                        className="overview-sub-section"
                                      >
                                        <div className="overview-sub-header">
                                          <span>— {sub.name}</span>
                                          <span className="department-overview-sub-count">
                                            {sub.user_count ?? 0} người
                                          </span>
                                        </div>
                                        {subUsers.length > 0 ? (
                                          <div className="user-grid overview-user-grid">
                                            {subUsers.map((u) => {
                                              const abbreviatedName =
                                                getAbbreviatedName(u);
                                              return (
                                                <div
                                                  key={u.id}
                                                  className="user-card"
                                                  onClick={() =>
                                                    setSelectedUserId(u.id)
                                                  }
                                                >
                                                  <div className="user-avatar">
                                                    <img
                                                      src={
                                                        u.profile_img ||
                                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(abbreviatedName)}&background=6b7280&color=fff&size=128`
                                                      }
                                                      alt={abbreviatedName}
                                                    />
                                                    {u.is_admin && (
                                                      <span className="admin-badge">
                                                        Quản trị
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="user-name">
                                                    {abbreviatedName}
                                                  </div>
                                                  {renderUserTooltip(u, sub.id)}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <p className="overview-no-users">
                                            Chưa có người dùng
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Note: With many-to-many, there are no "direct" department users */}
                              {!hasSubDepts && deptUsers.length === 0 && (
                                <p className="overview-no-users">
                                  Chưa có người dùng
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
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
                    const abbreviatedName = getAbbreviatedName(u);
                    const subDeptId =
                      selectedFilter?.type === "sub" ? selectedFilter.id : null;
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
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(abbreviatedName)}&background=6b7280&color=fff&size=128`
                            }
                            alt={abbreviatedName}
                          />
                          {u.is_admin && (
                            <span className="admin-badge">Quản trị</span>
                          )}
                        </div>
                        <div className="user-name">{abbreviatedName}</div>
                        {renderUserTooltip(u, subDeptId)}
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
