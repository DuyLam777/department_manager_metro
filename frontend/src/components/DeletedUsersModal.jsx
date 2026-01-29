import { useState, useEffect } from 'react'
import './DeletedUsersModal.css'

export function DeletedUsersModal({ token, onClose, onRestore }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    fetchDeletedUsers()
  }, [])

  const fetchDeletedUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/users/deleted/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch deleted users')
      const data = await response.json()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (userId, username) => {
    if (!confirm(`Restore user "${username}"?`)) return
    
    setActionLoading(userId)
    try {
      const response = await fetch(`/api/users/${userId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to restore user')
      }
      
      const result = await response.json()
      setUsers(users.filter(u => u.id !== userId))
      onRestore(result.user)
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handlePermanentDelete = async (userId, username) => {
    if (!confirm(`PERMANENTLY delete "${username}"? This cannot be undone!`)) return
    
    setActionLoading(userId)
    try {
      const response = await fetch(`/api/users/${userId}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to delete user')
      }
      
      setUsers(users.filter(u => u.id !== userId))
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCleanup = async () => {
    if (!confirm('Permanently delete all users that were deleted more than 30 days ago?')) return
    
    setActionLoading('cleanup')
    try {
      const response = await fetch('/api/users/deleted/cleanup?days=30', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to cleanup')
      }
      
      const result = await response.json()
      alert(result.message)
      fetchDeletedUsers()
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
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content deleted-users-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Deleted Users</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="modal-toolbar">
          <span className="user-count-info">
            {users.length} deleted user{users.length !== 1 ? 's' : ''}
          </span>
          <button 
            className="btn-cleanup"
            onClick={handleCleanup}
            disabled={actionLoading === 'cleanup' || users.length === 0}
          >
            {actionLoading === 'cleanup' ? 'Cleaning...' : 'Cleanup 30+ Days'}
          </button>
        </div>

        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : users.length === 0 ? (
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
                      <div className="user-meta">
                        @{u.username} • {u.department || 'No department'}
                      </div>
                      <div className="deleted-info">
                        Deleted: {formatDate(u.deleted_at)}
                        {daysAgo !== null && (
                          <span className={daysAgo >= 30 ? 'days-warning' : ''}>
                            {' '}({daysAgo} days ago)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="user-actions">
                    <button
                      className="btn-restore"
                      onClick={() => handleRestore(u.id, getDisplayName(u))}
                      disabled={actionLoading === u.id}
                    >
                      {actionLoading === u.id ? '...' : 'Restore'}
                    </button>
                    <button
                      className="btn-perma-delete"
                      onClick={() => handlePermanentDelete(u.id, getDisplayName(u))}
                      disabled={actionLoading === u.id}
                    >
                      {actionLoading === u.id ? '...' : 'Delete Forever'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
