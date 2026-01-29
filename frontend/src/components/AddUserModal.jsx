import { useState } from 'react'
import './AddUserModal.css'

export function AddUserModal({ departments, defaultDepartmentId, defaultSubDepartmentId, token, onClose, onUserCreated }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [generatedPassword, setGeneratedPassword] = useState(null)
  
  // Form state: one of department_id or sub_department_id (value like "dept-1" or "sub-2")
  const initialPlace = defaultSubDepartmentId ? `sub-${defaultSubDepartmentId}` : (defaultDepartmentId ? `dept-${defaultDepartmentId}` : '')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [departmentOrSub, setDepartmentOrSub] = useState(initialPlace)

  // Check if form has any data entered
  const hasUnsavedChanges = () => {
    return (
      username.trim() !== '' ||
      email.trim() !== '' ||
      firstName.trim() !== '' ||
      lastName.trim() !== '' ||
      departmentOrSub !== initialPlace
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    
    try {
      const [departmentId, subDepartmentId] = departmentOrSub.startsWith('sub-')
        ? [null, parseInt(departmentOrSub.slice(4), 10)]
        : departmentOrSub.startsWith('dept-')
          ? [parseInt(departmentOrSub.slice(5), 10), null]
          : [null, null]

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          email: email || null,
          first_name: firstName || null,
          last_name: lastName || null,
          department_id: departmentId,
          sub_department_id: subDepartmentId
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to create user')
      }

      const newUser = await response.json()
      setGeneratedPassword(newUser.generated_password)
      onUserCreated(newUser)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword)
  }

  // Show success screen with generated password
  if (generatedPassword) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content add-user-modal" onClick={(e) => e.stopPropagation()}>
          <div className="add-user-modal-header">
            <h2>User Created Successfully</h2>
            <button type="button" className="add-user-close-btn" onClick={onClose} aria-label="Close">&times;</button>
          </div>

          <div className="success-content">
            <div className="success-icon">✓</div>
            <p className="success-message">
              User <strong>{username}</strong> has been created.
            </p>
            
            <div className="password-section">
              <label>Generated Password (shown only once):</label>
              <div className="password-display">
                <code>{generatedPassword}</code>
                <button type="button" className="btn-copy" onClick={copyPassword}>
                  Copy
                </button>
              </div>
              <p className="password-warning">
                Please save this password. It will not be shown again.
              </p>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-save" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content add-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-user-modal-header">
          <h2>Add New User</h2>
          <button type="button" className="add-user-close-btn" onClick={handleClose} aria-label="Close">&times;</button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
            />
          </div>

          <div className="form-group">
            <label htmlFor="department">Department / Sub-department</label>
            <select
              id="department"
              value={departmentOrSub}
              onChange={(e) => setDepartmentOrSub(e.target.value)}
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

          <p className="form-note">
            A random password will be generated for this user.
          </p>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-save"
              disabled={saving || !username.trim()}
            >
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
