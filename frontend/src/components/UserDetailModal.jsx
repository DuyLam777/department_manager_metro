import { useState, useEffect } from 'react'
import './UserDetailModal.css'

export function UserDetailModal({ userId, departments, isAdmin, token, onClose, onUpdate, onDelete }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [newPassword, setNewPassword] = useState(null)
  
  // Original values to detect changes
  const [originalValues, setOriginalValues] = useState(null)
  
  // Form state: "dept-1" or "sub-2" for department/sub_department
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [profileImg, setProfileImg] = useState('')
  const [departmentOrSub, setDepartmentOrSub] = useState('')

  useEffect(() => {
    fetchUser()
  }, [userId])

  const fetchUser = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/users/${userId}`)
      if (!response.ok) throw new Error('Failed to fetch user')
      const data = await response.json()
      setUser(data)
      
      // Set form values
      setUsername(data.username)
      setEmail(data.email || '')
      setFirstName(data.first_name || '')
      setLastName(data.last_name || '')
      setProfileImg(data.profile_img || '')
      const place = data.sub_department_id
        ? `sub-${data.sub_department_id}`
        : data.department_id
          ? `dept-${data.department_id}`
          : ''
      setDepartmentOrSub(place)

      // Store original values for change detection
      setOriginalValues({
        username: data.username,
        email: data.email || '',
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        profileImg: data.profile_img || '',
        departmentOrSub: place
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Check if form has unsaved changes
  const hasUnsavedChanges = () => {
    if (!originalValues || !isAdmin) return false
    return (
      username !== originalValues.username ||
      email !== originalValues.email ||
      firstName !== originalValues.firstName ||
      lastName !== originalValues.lastName ||
      profileImg !== originalValues.profileImg ||
      departmentOrSub !== originalValues.departmentOrSub
    )
  }

  // Handle close with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges()) {
      if (confirm('You have unsaved changes. Discard them?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  const getDisplayName = () => {
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim()
    }
    return username
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const [departmentId, subDepartmentId] = departmentOrSub.startsWith('sub-')
        ? [null, parseInt(departmentOrSub.slice(4), 10)]
        : departmentOrSub.startsWith('dept-')
          ? [parseInt(departmentOrSub.slice(5), 10), null]
          : [null, null]

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          email: email || null,
          first_name: firstName || null,
          last_name: lastName || null,
          profile_img: profileImg || null,
          department_id: departmentId,
          sub_department_id: subDepartmentId
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to update user')
      }

      const updatedUser = await response.json()
      onUpdate(updatedUser)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!confirm(`Are you sure you want to reset the password for ${username}?`)) {
      return
    }
    
    setResetting(true)
    setError(null)
    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to reset password')
      }

      const result = await response.json()
      setNewPassword(result.new_password)
    } catch (err) {
      setError(err.message)
    } finally {
      setResetting(false)
    }
  }

  const copyPassword = () => {
    navigator.clipboard.writeText(newPassword)
  }

  const handleDelete = async () => {
    const displayName = getDisplayName()
    if (!confirm(`Are you sure you want to delete ${displayName}? This action cannot be undone.`)) {
      return
    }
    
    setDeleting(true)
    setError(null)
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to delete user')
      }

      onDelete(userId)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-content user-detail-modal" onClick={(e) => e.stopPropagation()}>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  const displayName = getDisplayName()

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content user-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isAdmin ? 'Edit User' : 'User Details'}</h2>
          <button className="close-btn" onClick={handleClose}>&times;</button>
        </div>

        <div className="user-profile-section">
          <img 
            src={profileImg || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6b7280&color=fff&size=128`}
            alt={displayName}
            className="profile-preview"
          />
          {user?.is_admin && <span className="admin-tag">Administrator</span>}
        </div>

        {(user?.effective_department || user?.department) && (
          <div className="user-department-display">
            <div className="department-display-row">
              <span className="department-display-label">Department:</span>
              <span className="department-display-value">{user.effective_department || user.department}</span>
            </div>
            {user?.sub_department && (
              <div className="department-display-row">
                <span className="department-display-label">Sub-department:</span>
                <span className="department-display-value">{user.sub_department}</span>
              </div>
            )}
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={!isAdmin}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={!isAdmin}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!isAdmin}
          />
        </div>

        <div className="form-group">
          <label htmlFor="profileImg">Profile Image URL</label>
          <input
            id="profileImg"
            type="text"
            value={profileImg}
            onChange={(e) => setProfileImg(e.target.value)}
            placeholder="https://example.com/image.jpg"
            disabled={!isAdmin}
          />
        </div>

        <div className="form-group">
          <label htmlFor="department">Department / Sub-department</label>
          <select
            id="department"
            value={departmentOrSub}
            onChange={(e) => setDepartmentOrSub(e.target.value)}
            disabled={!isAdmin}
          >
            <option value="">No Department</option>
            {departments.map((dept) => (
              <optgroup key={dept.id} label={dept.name}>
                <option value={`dept-${dept.id}`}>
                  {dept.name}
                </option>
                {(dept.sub_departments || []).map((sub) => (
                  <option key={`sub-${sub.id}`} value={`sub-${sub.id}`}>
                    — {sub.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {isAdmin && (
          <div className="password-reset-section">
            <label>Password</label>
            {newPassword ? (
              <div className="new-password-display">
                <code>{newPassword}</code>
                <button type="button" className="btn-copy" onClick={copyPassword}>
                  Copy
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                className="btn-reset-password"
                onClick={handleResetPassword}
                disabled={resetting}
              >
                {resetting ? 'Resetting...' : 'Reset Password'}
              </button>
            )}
            {newPassword && (
              <p className="password-warning">
                Save this password now. It will not be shown again.
              </p>
            )}
          </div>
        )}

        {isAdmin && !user?.is_admin && (
          <div className="danger-zone">
            <label>Danger Zone</label>
            <button 
              type="button" 
              className="btn-delete"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={handleClose}>
            {isAdmin ? 'Cancel' : 'Close'}
          </button>
          {isAdmin && (
            <button 
              type="button" 
              className="btn-save" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
