import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { Header } from './components/Header'
import { LoginModal } from './components/LoginModal'
import { UserDetailModal } from './components/UserDetailModal'
import { AddUserModal } from './components/AddUserModal'
import { DeletedUsersModal } from './components/DeletedUsersModal'
import './App.css'

function App() {
  const { user, loading: authLoading, login, logout, getToken } = useAuth()
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showDeletedUsersModal, setShowDeletedUsersModal] = useState(false)

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
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [deptRes, usersRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/users')
      ])
      
      if (!deptRes.ok || !usersRes.ok) {
        throw new Error('Failed to fetch data')
      }
      
      const [deptData, usersData] = await Promise.all([
        deptRes.json(),
        usersRes.json()
      ])
      
      setDepartments(deptData)
      setUsers(usersData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter by department first, then by search query
  const filteredUsers = users
    .filter(u => !selectedDepartment || u.department === selectedDepartment)
    .filter(matchesSearch)

  // Compute department user counts from current users array
  const departmentCounts = users.reduce((acc, u) => {
    if (u.department) {
      acc[u.department] = (acc[u.department] || 0) + 1
    }
    return acc
  }, {})

  const handleUserUpdate = (updatedUser) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
  }

  const handleUserCreated = (newUser) => {
    setUsers([...users, newUser])
  }

  const handleUserDelete = (userId) => {
    setUsers(users.filter(u => u.id !== userId))
  }

  const handleUserRestore = (restoredUser) => {
    setUsers([...users, restoredUser])
  }

  // Get department ID from selected department name
  const getSelectedDepartmentId = () => {
    if (!selectedDepartment) return null
    const dept = departments.find(d => d.name === selectedDepartment)
    return dept ? dept.id : null
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
        onDeletedUsersClick={() => setShowDeletedUsersModal(true)}
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
          defaultDepartmentId={getSelectedDepartmentId()}
          token={getToken()}
          onClose={() => setShowAddUserModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}

      {showDeletedUsersModal && (
        <DeletedUsersModal
          token={getToken()}
          onClose={() => setShowDeletedUsersModal(false)}
          onRestore={handleUserRestore}
        />
      )}

      <div className="layout">
        <aside className="sidebar">
          <h2>Departments</h2>
          <ul className="department-list">
            <li
              className={selectedDepartment === null ? 'active' : ''}
              onClick={() => setSelectedDepartment(null)}
            >
              All Departments
            </li>
            {departments.map((dept) => (
              <li
                key={dept.id}
                className={selectedDepartment === dept.name ? 'active' : ''}
                onClick={() => setSelectedDepartment(dept.name)}
              >
                {dept.name}
                <span className="user-count">{departmentCounts[dept.name] || 0}</span>
              </li>
            ))}
          </ul>
        </aside>

        <main className="main-content">
          {loading ? (
            <p>Loading data...</p>
          ) : error ? (
            <p className="error-text">Error: {error}</p>
          ) : (
            <>
              <div className="content-header">
                <h1>
                  {selectedDepartment ? `${selectedDepartment} Users` : 'All Users'}
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
              
              {filteredUsers.length === 0 ? (
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
                            <span>{u.department || '-'}</span>
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
