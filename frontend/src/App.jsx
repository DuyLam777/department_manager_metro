import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { Header } from './components/Header'
import { LoginModal } from './components/LoginModal'
import { UserDetailModal } from './components/UserDetailModal'
import { AddUserModal } from './components/AddUserModal'
import { DeletedItemsModal } from './components/DeletedItemsModal'
import { ManageDepartmentsModal } from './components/ManageDepartmentsModal'
import './App.css'

function App() {
  const { user, loading: authLoading, login, logout, getToken } = useAuth()
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  // { type: 'department', id, name } | { type: 'sub', id, name, departmentName } | null (all)
  const [selectedFilter, setSelectedFilter] = useState(null)
  // Department dropdowns: closed by default. Set of department ids that are expanded.
  const [expandedDepartmentIds, setExpandedDepartmentIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [error, setError] = useState(null)
  const [usersError, setUsersError] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState('')
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showDeletedItemsModal, setShowDeletedItemsModal] = useState(false)
  const [showManageDepartmentsModal, setShowManageDepartmentsModal] = useState(false)

  // Fuzzy match function - checks if query chars appear in order in target
  const fuzzyMatch = (query, target) => {
    if (!query) return true
    if (!target) return false
    
    const q = query.toLowerCase()
    const t = target.toLowerCase()
    
    let qi = 0
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) qi++
    }
    return qi === q.length
  }

  // Fuzzy filter departments/sub-departments by name for sidebar
  const departmentMatchesSearch = (dept) => {
    if (!departmentSearchQuery.trim()) return true
    if (fuzzyMatch(departmentSearchQuery, dept.name)) return true
    return (dept.sub_departments || []).some((sub) => fuzzyMatch(departmentSearchQuery, sub.name))
  }
  const filteredDepartments = departments.filter(departmentMatchesSearch)

  // Check if user matches search query
  const matchesSearch = (u) => {
    if (!searchQuery.trim()) return true
    
    const searchFields = [
      u.first_name,
      u.last_name,
      `${u.first_name || ''} ${u.last_name || ''}`,
      u.username,
      u.email
    ]
    
    return searchFields.some(field => fuzzyMatch(searchQuery, field))
  }

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/departments')
      if (!res.ok) throw new Error('Failed to fetch departments')
      const data = await res.json()
      setDepartments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsersForFilter = async (filter) => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      let url = '/api/users'
      if (filter?.type === 'department') {
        url += `?department_id=${filter.id}`
      } else if (filter?.type === 'sub') {
        url += `?sub_department_id=${filter.id}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      setUsersError(err.message)
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }

  // Auto-expand departments when search matches a sub-department name
  useEffect(() => {
    if (!departmentSearchQuery.trim()) return
    const toExpand = new Set()
    departments.forEach((dept) => {
      const subMatches = (dept.sub_departments || []).some((sub) =>
        fuzzyMatch(departmentSearchQuery, sub.name)
      )
      if (subMatches) toExpand.add(dept.id)
    })
    if (toExpand.size > 0) {
      setExpandedDepartmentIds((prev) => new Set([...prev, ...toExpand]))
    }
  }, [departmentSearchQuery, departments])

  const fetchData = async () => {
    await fetchDepartments()
    if (selectedFilter !== null) {
      await fetchUsersForFilter(selectedFilter)
    }
  }

  // Filter by department/sub_department or all, then by search query
  const filteredUsers = users.filter((u) => {
    if (!selectedFilter) return true
    if (selectedFilter.type === 'department') {
      return u.effective_department === selectedFilter.name
    }
    if (selectedFilter.type === 'sub') {
      return u.sub_department_id === selectedFilter.id
    }
    return true
  }).filter(matchesSearch)

  const handleUserUpdate = (updatedUser) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
  }

  const handleUserCreated = () => {
    fetchUsersForFilter(selectedFilter)
  }

  const handleUserDelete = (userId) => {
    setUsers(users.filter(u => u.id !== userId))
  }

  const handleUserRestore = () => {
    fetchUsersForFilter(selectedFilter)
  }

  // Get default department/sub for Add User when a filter is selected
  const getDefaultDepartmentId = () => {
    if (!selectedFilter) return null
    if (selectedFilter.type === 'department') return selectedFilter.id
    return null
  }
  const getDefaultSubDepartmentId = () => {
    if (selectedFilter?.type === 'sub') return selectedFilter.id
    return null
  }

  // Helper to get display name
  const getDisplayName = (u) => {
    if (u.first_name || u.last_name) {
      return `${u.first_name || ''} ${u.last_name || ''}`.trim()
    }
    return u.username
  }

  if (authLoading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="app-container">
      <Header 
        user={user} 
        onLoginClick={() => setShowLoginModal(true)} 
        onLogout={logout}
        onDeletedItemsClick={() => setShowDeletedItemsModal(true)}
      />

      {showLoginModal && (
        <LoginModal
          onLogin={login}
          onClose={() => setShowLoginModal(false)}
        />
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

      <div className="layout">
        <aside className="sidebar">
          <h2>Departments</h2>
          <div className="sidebar-dept-search">
            <input
              type="text"
              placeholder="Search departments..."
              value={departmentSearchQuery}
              onChange={(e) => setDepartmentSearchQuery(e.target.value)}
              className="sidebar-search-input"
            />
            {departmentSearchQuery && (
              <button
                type="button"
                className="sidebar-search-clear"
                onClick={() => setDepartmentSearchQuery('')}
                aria-label="Clear"
              >
                &times;
              </button>
            )}
          </div>
          <ul className="department-list">
            <li>
              <div
                className={`department-item ${!selectedFilter ? 'active' : ''}`}
                onClick={() => setSelectedFilter(null)}
              >
                All Departments
                <span className="user-count">
                  {departments.reduce((sum, d) => sum + (d.user_count ?? 0), 0)}
                </span>
              </div>
            </li>
            {filteredDepartments.map((dept) => {
              const isExpanded = expandedDepartmentIds.has(dept.id)
              const hasSubDepts = (dept.sub_departments?.length ?? 0) > 0
              const isDeptSelected = selectedFilter?.type === 'department' && selectedFilter?.id === dept.id
              return (
                <li key={`dept-${dept.id}`}>
                  <div
                    className={`department-item department-dropdown-trigger ${hasSubDepts ? 'has-children' : ''} ${isExpanded ? 'expanded' : ''} ${isDeptSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedFilter({ type: 'department', id: dept.id, name: dept.name })
                      fetchUsersForFilter({ type: 'department', id: dept.id, name: dept.name })
                      if (hasSubDepts) {
                        setExpandedDepartmentIds((prev) => {
                          const next = new Set(prev)
                          if (!next.has(dept.id)) next.add(dept.id)
                          return next
                        })
                      }
                    }}
                  >
                    <span className="department-label">
                      {hasSubDepts && (
                        <span className="department-chevron" aria-hidden>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      )}
                      {dept.name}
                    </span>
                    <span className="user-count">{dept.user_count ?? 0}</span>
                  </div>
                  {hasSubDepts && (
                    <ul className={`sub-department-list ${isExpanded ? 'is-open' : ''}`}>
                      {dept.sub_departments.map((sub) => (
                        <li
                          key={`sub-${sub.id}`}
                          className={selectedFilter?.type === 'sub' && selectedFilter?.id === sub.id ? 'active' : ''}
                          onClick={(e) => {
                            e.stopPropagation()
                            const filter = { type: 'sub', id: sub.id, name: sub.name, departmentName: dept.name }
                            setSelectedFilter(filter)
                            fetchUsersForFilter(filter)
                          }}
                        >
                          {sub.name}
                          <span className="user-count">{sub.user_count ?? 0}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
          {user?.is_admin && (
            <button
              type="button"
              className="sidebar-add-dept-btn"
              onClick={() => setShowManageDepartmentsModal(true)}
            >
              Manage department
            </button>
          )}
        </aside>

        <main className="main-content">
          {loading ? (
            <p>Loading departments...</p>
          ) : error ? (
            <p className="error-text">Error: {error}</p>
          ) : !selectedFilter ? (
            <>
              <div className="content-header">
                <h1>Departments &amp; Sub-departments</h1>
              </div>
              <div className="departments-overview">
                {filteredDepartments.map((dept) => (
                  <div key={dept.id} className="department-overview-card">
                    <div
                      className="department-overview-header department-overview-clickable"
                      onClick={() => {
                        setSelectedFilter({ type: 'department', id: dept.id, name: dept.name })
                        fetchUsersForFilter({ type: 'department', id: dept.id, name: dept.name })
                        if ((dept.sub_departments?.length ?? 0) > 0) {
                          setExpandedDepartmentIds((prev) => new Set([...prev, dept.id]))
                        }
                      }}
                    >
                      <span className="department-overview-name">{dept.name}</span>
                      <span className="department-overview-count">{dept.user_count ?? 0} users</span>
                    </div>
                    {dept.description && (
                      <p className="department-overview-desc">{dept.description}</p>
                    )}
                    {(dept.sub_departments?.length ?? 0) > 0 && (
                      <ul className="department-overview-subs">
                        {dept.sub_departments.map((sub) => (
                          <li
                            key={sub.id}
                            className="department-overview-sub-clickable"
                            onClick={() => {
                              const filter = { type: 'sub', id: sub.id, name: sub.name, departmentName: dept.name }
                              setSelectedFilter(filter)
                              fetchUsersForFilter(filter)
                              setExpandedDepartmentIds((prev) => new Set([...prev, dept.id]))
                            }}
                          >
                            — {sub.name}
                            <span className="department-overview-sub-count">{sub.user_count ?? 0} users</span>
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
                  {selectedFilter.type === 'sub'
                    ? `${selectedFilter.name} (${selectedFilter.departmentName}) Users`
                    : `${selectedFilter.name} Users`}
                </h1>
                <div className="header-actions">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                    {searchQuery && (
                      <button 
                        type="button"
                        className="search-clear"
                        onClick={() => setSearchQuery('')}
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
                      + Add User
                    </button>
                  )}
                </div>
              </div>
              
              {usersLoading ? (
                <p className="no-users">Loading users...</p>
              ) : usersError ? (
                <p className="error-text">Error loading users: {usersError}</p>
              ) : filteredUsers.length === 0 ? (
                <p className="no-users">No users found</p>
              ) : (
                <div className="user-grid">
                  {filteredUsers.map((u) => {
                    const displayName = getDisplayName(u)
                    return (
                      <div 
                        key={u.id} 
                        className="user-card"
                        onClick={() => setSelectedUserId(u.id)}
                      >
                        <div className="user-avatar">
                          <img 
                            src={u.profile_img || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6b7280&color=fff&size=128`} 
                            alt={displayName} 
                          />
                          {u.is_admin && <span className="admin-badge">Admin</span>}
                        </div>
                        <div className="user-name">{displayName}</div>
                        
                        <div className="user-tooltip">
                          <div className="tooltip-row">
                            <span className="tooltip-label">Username:</span>
                            <span>{u.username}</span>
                          </div>
                          <div className="tooltip-row">
                            <span className="tooltip-label">Email:</span>
                            <span>{u.email || '-'}</span>
                          </div>
                          <div className="tooltip-row">
                            <span className="tooltip-label">Department:</span>
                            <span>
                              {u.sub_department
                                ? `${u.sub_department} (${u.effective_department})`
                                : (u.effective_department || u.department || '-')}
                            </span>
                          </div>
                          <div className="tooltip-row">
                            <span className="tooltip-label">Role:</span>
                            <span>{u.is_admin ? 'Administrator' : 'User'}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
