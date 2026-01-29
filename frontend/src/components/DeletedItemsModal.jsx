import { useState, useEffect } from 'react'
import './DeletedItemsModal.css'

const authHeaders = (token) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

export function DeletedItemsModal({ token, onClose, onRestoreUser, onRestoreDepartment, onRestoreSubDepartment }) {
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [subDepartments, setSubDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  const fetchDeletedItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersRes, deptsRes, subsRes] = await Promise.all([
        fetch('/api/users/deleted/list', { headers: authHeaders(token) }),
        fetch('/api/departments/deleted/list', { headers: authHeaders(token) }),
        fetch('/api/sub-departments/deleted/list', { headers: authHeaders(token) }),
      ])
      if (!usersRes.ok) throw new Error('Failed to fetch deleted users')
      if (!deptsRes.ok) throw new Error('Failed to fetch deleted departments')
      if (!subsRes.ok) throw new Error('Failed to fetch deleted sub-departments')
      const [usersData, deptsData, subsData] = await Promise.all([
        usersRes.json(),
        deptsRes.json(),
        subsRes.json(),
      ])
      setUsers(usersData)
      setDepartments(deptsData)
      setSubDepartments(subsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeletedItems()
  }, [])

  const handleRestoreUser = async (userId, username) => {
    if (!confirm(`Restore user "${username}"?`)) return
    setActionLoading(`user-${userId}`)
    try {
      const response = await fetch(`/api/users/${userId}/restore`, {
        method: 'POST',
        headers: authHeaders(token),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to restore user')
      }
      const result = await response.json()
      setUsers(users.filter((u) => u.id !== userId))
      onRestoreUser?.(result.user)
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRestoreDepartment = async (deptId, name) => {
    if (!confirm(`Restore department "${name}"?`)) return
    setActionLoading(`dept-${deptId}`)
    try {
      const response = await fetch(`/api/departments/${deptId}/restore`, {
        method: 'POST',
        headers: authHeaders(token),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to restore department')
      }
      setDepartments(departments.filter((d) => d.id !== deptId))
      onRestoreDepartment?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRestoreSubDepartment = async (subId, name) => {
    if (!confirm(`Restore sub-department "${name}"?`)) return
    setActionLoading(`sub-${subId}`)
    try {
      const response = await fetch(`/api/sub-departments/${subId}/restore`, {
        method: 'POST',
        headers: authHeaders(token),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to restore sub-department')
      }
      setSubDepartments(subDepartments.filter((s) => s.id !== subId))
      onRestoreSubDepartment?.()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handlePermanentDeleteUser = async (userId, username) => {
    if (!confirm(`PERMANENTLY delete "${username}"? This cannot be undone!`)) return
    setActionLoading(`user-${userId}`)
    try {
      const response = await fetch(`/api/users/${userId}/permanent`, {
        method: 'DELETE',
        headers: authHeaders(token),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to delete user')
      }
      setUsers(users.filter((u) => u.id !== userId))
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCleanupOldDeletedUsers = async () => {
    if (!confirm('Permanently delete all users that were deleted more than 30 days ago?')) return
    setActionLoading('cleanup')
    try {
      const response = await fetch('/api/users/deleted/cleanup?days=30', {
        method: 'DELETE',
        headers: authHeaders(token),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to cleanup')
      }
      const result = await response.json()
      alert(result.message)
      fetchDeletedItems()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const getDisplayName = (u) => {
    if (u.first_name || u.last_name) {
      return `${u.first_name || ''} ${u.last_name || ''}`.trim()
    }
    return u.username
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    const date = new Date(dateStr)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const getDaysAgo = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = now - date
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content deleted-items-modal" onClick={(e) => e.stopPropagation()}>
        <div className="deleted-items-modal-header">
          <h2>Deleted Items</h2>
          <button type="button" className="deleted-items-close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : (
          <div className="deleted-items-modal-body">
            {/* Deleted Users section */}
            <section className="deleted-section">
              <div className="deleted-section-header">
                <h3>Deleted Users</h3>
                <span className="deleted-section-count">{users.length} user{users.length !== 1 ? 's' : ''}</span>
                <button
                  type="button"
                  className="btn-cleanup"
                  onClick={handleCleanupOldDeletedUsers}
                  disabled={actionLoading === 'cleanup' || users.length === 0}
                >
                  {actionLoading === 'cleanup' ? 'Cleaning...' : 'Cleanup 30+ Days'}
                </button>
              </div>
              {users.length === 0 ? (
                <p className="empty-text">No deleted users</p>
              ) : (
                <div className="deleted-users-list">
                  {users.map((u) => {
                    const daysAgo = getDaysAgo(u.deleted_at)
                    return (
                      <div key={u.id} className="deleted-user-row">
                        <div className="user-info">
                          <img
                            src={u.profile_img || `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName(u))}&background=6b7280&color=fff&size=40`}
                            alt={getDisplayName(u)}
                            className="user-avatar-small"
                          />
                          <div className="user-details">
                            <div className="user-name">{getDisplayName(u)}</div>
                            <div className="user-meta">@{u.username} • {u.department || 'No department'}</div>
                            <div className="deleted-info">
                              Deleted: {formatDate(u.deleted_at)}
                              {daysAgo !== null && (
                                <span className={daysAgo >= 30 ? 'days-warning' : ''}> ({daysAgo} days ago)</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="user-actions">
                          <button
                            type="button"
                            className="btn-restore"
                            onClick={() => handleRestoreUser(u.id, getDisplayName(u))}
                            disabled={actionLoading === `user-${u.id}`}
                          >
                            {actionLoading === `user-${u.id}` ? '...' : 'Restore'}
                          </button>
                          <button
                            type="button"
                            className="btn-perma-delete"
                            onClick={() => handlePermanentDeleteUser(u.id, getDisplayName(u))}
                            disabled={actionLoading === `user-${u.id}`}
                          >
                            Delete Forever
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Deleted Departments section */}
            <section className="deleted-section">
              <div className="deleted-section-header">
                <h3>Deleted Departments</h3>
                <span className="deleted-section-count">{departments.length} department{departments.length !== 1 ? 's' : ''}</span>
              </div>
              {departments.length === 0 ? (
                <p className="empty-text">No deleted departments</p>
              ) : (
                <ul className="deleted-dept-list">
                  {departments.map((d) => (
                    <li key={d.id} className="deleted-dept-row">
                      <div className="deleted-dept-info">
                        <span className="deleted-dept-name">{d.name}</span>
                        {d.description && <span className="deleted-dept-desc">{d.description}</span>}
                        <span className="deleted-dept-date">Deleted: {formatDate(d.deleted_at)}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-restore"
                        onClick={() => handleRestoreDepartment(d.id, d.name)}
                        disabled={actionLoading === `dept-${d.id}`}
                      >
                        {actionLoading === `dept-${d.id}` ? '...' : 'Restore'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Deleted Sub-departments section */}
            <section className="deleted-section">
              <div className="deleted-section-header">
                <h3>Deleted Sub-departments</h3>
                <span className="deleted-section-count">{subDepartments.length} sub-department{subDepartments.length !== 1 ? 's' : ''}</span>
              </div>
              {subDepartments.length === 0 ? (
                <p className="empty-text">No deleted sub-departments</p>
              ) : (
                <ul className="deleted-dept-list">
                  {subDepartments.map((s) => (
                    <li key={s.id} className="deleted-dept-row">
                      <div className="deleted-dept-info">
                        <span className="deleted-dept-name">— {s.name}</span>
                        {s.department_name && <span className="deleted-dept-desc">({s.department_name})</span>}
                        <span className="deleted-dept-date">Deleted: {formatDate(s.deleted_at)}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-restore"
                        onClick={() => handleRestoreSubDepartment(s.id, s.name)}
                        disabled={actionLoading === `sub-${s.id}`}
                      >
                        {actionLoading === `sub-${s.id}` ? '...' : 'Restore'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
