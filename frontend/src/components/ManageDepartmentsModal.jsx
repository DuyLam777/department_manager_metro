import { useState, useEffect } from 'react'
import './ManageDepartmentsModal.css'

const API = '/api'

export function ManageDepartmentsModal({ token, onClose, onSaved }) {
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Form state: which form is open
  const [addDepartment, setAddDepartment] = useState(false)
  const [editingDepartmentId, setEditingDepartmentId] = useState(null)
  const [addSubForDeptId, setAddSubForDeptId] = useState(null)
  const [editingSubId, setEditingSubId] = useState(null)

  // Selected unassigned user ids when adding to department
  const [selectedUserIdsToAdd, setSelectedUserIdsToAdd] = useState(new Set())

  // Form values
  const [deptName, setDeptName] = useState('')
  const [deptDescription, setDeptDescription] = useState('')
  const [subName, setSubName] = useState('')
  const [subDescription, setSubDescription] = useState('')
  const [subDepartmentId, setSubDepartmentId] = useState('')

  const fetchDepartments = async () => {
    setLoading(true)
    setError(null)
    try {
      const [deptRes, usersRes] = await Promise.all([
        fetch(`${API}/departments`),
        fetch(`${API}/users`)
      ])
      if (!deptRes.ok) throw new Error('Failed to fetch departments')
      if (!usersRes.ok) throw new Error('Failed to fetch users')
      const [deptData, usersData] = await Promise.all([deptRes.json(), usersRes.json()])
      setDepartments(deptData)
      setUsers(usersData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDepartments()
  }, [])

  const unassignedUsers = users.filter((u) => u.effective_department === 'Unassigned')
  const placeholderDeptId = departments.find((d) => d.is_placeholder)?.id
  // Users directly in the department being edited (department_id set, no sub_department)
  const currentDepartmentUsers = editingDepartmentId
    ? users.filter((u) => u.department_id === editingDepartmentId && !u.sub_department_id)
    : []
  // Users in the sub-department being edited
  const currentSubUsers = editingSubId
    ? users.filter((u) => u.sub_department_id === editingSubId)
    : []

  const resetForms = () => {
    setAddDepartment(false)
    setEditingDepartmentId(null)
    setAddSubForDeptId(null)
    setEditingSubId(null)
    setSelectedUserIdsToAdd(new Set())
    setDeptName('')
    setDeptDescription('')
    setSubName('')
    setSubDescription('')
    setSubDepartmentId('')
  }

  const toggleUserToAdd = (userId) => {
    setSelectedUserIdsToAdd((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const handleSaveDepartmentAssignments = async () => {
    if (!editingDepartmentId || !placeholderDeptId) return
    setSaving(true)
    setError(null)
    try {
      const currentIds = users
        .filter((u) => u.department_id === editingDepartmentId && !u.sub_department_id)
        .map((u) => u.id)
      const toUnassign = currentIds.filter((id) => !selectedUserIdsToAdd.has(id))
      const toAssign = [...selectedUserIdsToAdd]
      const assignResults = await Promise.all(
        toAssign.map((userId) =>
          fetch(`${API}/users/${userId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ department_id: editingDepartmentId, sub_department_id: null })
          }).then((r) => r.ok)
        )
      )
      const unassignResults = await Promise.all(
        toUnassign.map((userId) =>
          fetch(`${API}/users/${userId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ department_id: placeholderDeptId, sub_department_id: null })
          }).then((r) => r.ok)
        )
      )
      if (assignResults.some((ok) => !ok)) throw new Error('Failed to assign some users')
      if (unassignResults.some((ok) => !ok)) throw new Error('Failed to unassign some users')
      await fetchDepartments()
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSubDepartmentAssignments = async () => {
    if (!editingSubId || !placeholderDeptId) return
    setSaving(true)
    setError(null)
    try {
      const currentIds = users.filter((u) => u.sub_department_id === editingSubId).map((u) => u.id)
      const toUnassign = currentIds.filter((id) => !selectedUserIdsToAdd.has(id))
      const toAssign = [...selectedUserIdsToAdd]
      const assignResults = await Promise.all(
        toAssign.map((userId) =>
          fetch(`${API}/users/${userId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ sub_department_id: editingSubId })
          }).then((r) => r.ok)
        )
      )
      const unassignResults = await Promise.all(
        toUnassign.map((userId) =>
          fetch(`${API}/users/${userId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ department_id: placeholderDeptId, sub_department_id: null })
          }).then((r) => r.ok)
        )
      )
      if (assignResults.some((ok) => !ok)) throw new Error('Failed to assign some users')
      if (unassignResults.some((ok) => !ok)) throw new Error('Failed to unassign some users')
      await fetchDepartments()
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    resetForms()
    onClose()
  }

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  })

  const handleCreateDepartment = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/departments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: deptName.trim(), description: deptDescription.trim() || null }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to create department')
      }
      const created = await res.json()
      if (selectedUserIdsToAdd.size > 0 && created.id) {
        const results = await Promise.all(
          [...selectedUserIdsToAdd].map((userId) =>
            fetch(`${API}/users/${userId}`, {
              method: 'PUT',
              headers: authHeaders(),
              body: JSON.stringify({ department_id: created.id, sub_department_id: null })
            }).then((r) => r.ok)
          )
        )
        if (results.some((ok) => !ok)) throw new Error('Failed to add some users to the new department')
      }
      await fetchDepartments()
      onSaved?.()
      resetForms()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateDepartment = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/departments/${editingDepartmentId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ name: deptName.trim(), description: deptDescription.trim() || null }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to update department')
      }
      await fetchDepartments()
      onSaved?.()
      resetForms()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDepartment = async (dept) => {
    if (dept.is_placeholder) return
    if (!confirm(`Delete department "${dept.name}"? Sub-departments and users will be moved to Unassigned.`)) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/departments/${dept.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to delete department')
      }
      await fetchDepartments()
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateSubDepartment = async (e) => {
    e.preventDefault()
    if (!addSubForDeptId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/sub-departments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: subName.trim(),
          description: subDescription.trim() || null,
          department_id: parseInt(addSubForDeptId, 10),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to create sub-department')
      }
      const created = await res.json()
      if (selectedUserIdsToAdd.size > 0 && created.id) {
        const results = await Promise.all(
          [...selectedUserIdsToAdd].map((userId) =>
            fetch(`${API}/users/${userId}`, {
              method: 'PUT',
              headers: authHeaders(),
              body: JSON.stringify({ sub_department_id: created.id })
            }).then((r) => r.ok)
          )
        )
        if (results.some((ok) => !ok)) throw new Error('Failed to add some users to the new sub-department')
      }
      await fetchDepartments()
      onSaved?.()
      setAddSubForDeptId(null)
      setSubName('')
      setSubDescription('')
      setSelectedUserIdsToAdd(new Set())
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSubDepartment = async (e) => {
    e.preventDefault()
    if (!editingSubId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/sub-departments/${editingSubId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name: subName.trim(),
          description: subDescription.trim() || null,
          department_id: subDepartmentId ? parseInt(subDepartmentId, 10) : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to update sub-department')
      }
      await fetchDepartments()
      onSaved?.()
      resetForms()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSubDepartment = async (sub, deptName) => {
    if (sub.is_placeholder) return
    if (!confirm(`Delete sub-department "${sub.name}" (${deptName})? Users will be moved to Unassigned.`)) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/sub-departments/${sub.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to delete sub-department')
      }
      await fetchDepartments()
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const startEditDepartment = (dept) => {
    if (dept.is_placeholder) return
    setEditingDepartmentId(dept.id)
    setDeptName(dept.name)
    setDeptDescription(dept.description || '')
    const currentIds = users.filter((u) => u.department_id === dept.id && !u.sub_department_id).map((u) => u.id)
    setSelectedUserIdsToAdd(new Set(currentIds))
  }

  const startEditSub = (sub) => {
    if (sub.is_placeholder) return
    setEditingSubId(sub.id)
    setSubName(sub.name)
    setSubDescription(sub.description || '')
    setSubDepartmentId(String(sub.department_id))
    const currentIds = users.filter((u) => u.sub_department_id === sub.id).map((u) => u.id)
    setSelectedUserIdsToAdd(new Set(currentIds))
  }

  const isAdmin = !!token

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content manage-departments-modal" onClick={(e) => e.stopPropagation()}>
        <div className="manage-dept-modal-header">
          <h2>Departments &amp; Sub-departments</h2>
          <button type="button" className="manage-dept-close-btn" onClick={handleClose} aria-label="Close">
            &times;
          </button>
        </div>

        {!isAdmin && (
          <p className="manage-dept-readonly">You are viewing in read-only mode. Log in as admin to add, edit, or delete.</p>
        )}

        {error && <p className="error-message">{error}</p>}

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="manage-dept-list">
            {addDepartment && (
              <div className="manage-dept-form-card">
                <h3>Add department</h3>
                <form onSubmit={handleCreateDepartment}>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={deptName}
                      onChange={(e) => setDeptName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={deptDescription}
                      onChange={(e) => setDeptDescription(e.target.value)}
                    />
                  </div>
                  {unassignedUsers.length > 0 && (
                    <div className="manage-dept-add-users">
                      <h4>Add users from Unassigned</h4>
                      <ul className="unassigned-users-list">
                        {unassignedUsers.map((u) => {
                          const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
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
                                  {displayName !== u.username && u.username ? ` (${u.username})` : ''}
                                </span>
                              </label>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={() => setAddDepartment(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-save" disabled={saving || !deptName.trim()}>
                      {saving ? 'Saving...' : `Create${selectedUserIdsToAdd.size > 0 ? ` and add ${selectedUserIdsToAdd.size} user(s)` : ''}`}
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
                  setAddDepartment(true)
                  setSelectedUserIdsToAdd(new Set())
                }}
              >
                + Add department
              </button>
            )}

            {departments.map((dept) => (
              <div key={dept.id} className="manage-dept-card">
                {editingDepartmentId === dept.id ? (
                  <div className="manage-dept-form-inline">
                    <form onSubmit={handleUpdateDepartment}>
                      <div className="form-group">
                        <label>Name *</label>
                        <input
                          type="text"
                          value={deptName}
                          onChange={(e) => setDeptName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <input
                          type="text"
                          value={deptDescription}
                          onChange={(e) => setDeptDescription(e.target.value)}
                        />
                      </div>
                      <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={() => setEditingDepartmentId(null)}>
                          Cancel
                        </button>
                        <button type="submit" className="btn-save" disabled={saving}>
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </form>
                    {!dept.is_placeholder && (unassignedUsers.length > 0 || currentDepartmentUsers.length > 0) && (
                      <div className="manage-dept-add-users">
                        <h4>Assign users to {deptName || dept.name}</h4>
                        {unassignedUsers.length > 0 && (
                          <>
                            <p className="manage-dept-user-group-label">Unassigned</p>
                            <ul className="unassigned-users-list">
                              {unassignedUsers.map((u) => {
                                const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
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
                                        {displayName !== u.username && u.username ? ` (${u.username})` : ''}
                                      </span>
                                    </label>
                                  </li>
                                )
                              })}
                            </ul>
                          </>
                        )}
                        {unassignedUsers.length > 0 && currentDepartmentUsers.length > 0 && (
                          <div className="manage-dept-user-separator" aria-hidden="true" />
                        )}
                        {currentDepartmentUsers.length > 0 && (
                          <>
                            <p className="manage-dept-user-group-label">Current in {deptName || dept.name}</p>
                            <ul className="unassigned-users-list">
                              {currentDepartmentUsers.map((u) => {
                                const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
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
                                        {displayName !== u.username && u.username ? ` (${u.username})` : ''}
                                      </span>
                                    </label>
                                  </li>
                                )
                              })}
                            </ul>
                          </>
                        )}
                        <button
                          type="button"
                          className="btn-add-users-to-dept"
                          onClick={handleSaveDepartmentAssignments}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save assignments'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="manage-dept-row">
                    <div className="manage-dept-info">
                      <span className="manage-dept-name">
                        {dept.name}
                        {dept.is_placeholder && <span className="placeholder-badge">Unassigned</span>}
                      </span>
                      {dept.description && <span className="manage-dept-desc">{dept.description}</span>}
                      <span className="manage-dept-count">{dept.user_count} users</span>
                    </div>
                    {isAdmin && !dept.is_placeholder && (
                      <div className="manage-dept-actions">
                        <button type="button" className="btn-edit" onClick={() => startEditDepartment(dept)}>
                          Edit
                        </button>
                        <button type="button" className="btn-delete" onClick={() => handleDeleteDepartment(dept)} disabled={saving}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {addSubForDeptId === dept.id && (
                  <div className="manage-sub-form">
                    <form onSubmit={handleCreateSubDepartment}>
                      <div className="form-group">
                        <label>Sub-department name *</label>
                        <input
                          type="text"
                          value={subName}
                          onChange={(e) => setSubName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <input
                          type="text"
                          value={subDescription}
                          onChange={(e) => setSubDescription(e.target.value)}
                        />
                      </div>
                      {unassignedUsers.length > 0 && (
                        <div className="manage-dept-add-users">
                          <h4>Add users from Unassigned</h4>
                          <ul className="unassigned-users-list">
                            {unassignedUsers.map((u) => {
                              const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
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
                                      {displayName !== u.username && u.username ? ` (${u.username})` : ''}
                                    </span>
                                  </label>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}
                      <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={() => setAddSubForDeptId(null)}>
                          Cancel
                        </button>
                        <button type="submit" className="btn-save" disabled={saving || !subName.trim()}>
                          {saving ? 'Saving...' : `Add${selectedUserIdsToAdd.size > 0 ? ` and add ${selectedUserIdsToAdd.size} user(s)` : ''}`}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {isAdmin && !dept.is_placeholder && addSubForDeptId !== dept.id && (
                  <button
                    type="button"
                    className="btn-add-sub"
                    onClick={() => {
                      setAddSubForDeptId(dept.id)
                      setSelectedUserIdsToAdd(new Set())
                    }}
                  >
                    + Add sub-department
                  </button>
                )}

                <ul className="manage-sub-list">
                  {(dept.sub_departments || []).map((sub) => (
                    <li key={sub.id}>
                      {editingSubId === sub.id ? (
                        <div className="manage-sub-form-inline">
                          <form onSubmit={handleUpdateSubDepartment}>
                            <div className="form-group">
                              <label>Name *</label>
                              <input
                                type="text"
                                value={subName}
                                onChange={(e) => setSubName(e.target.value)}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Description</label>
                              <input
                                type="text"
                                value={subDescription}
                                onChange={(e) => setSubDescription(e.target.value)}
                              />
                            </div>
                            <div className="form-group">
                              <label>Department</label>
                              <select
                                value={subDepartmentId}
                                onChange={(e) => setSubDepartmentId(e.target.value)}
                              >
                                {departments.filter((d) => !d.is_placeholder).map((d) => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-actions">
                              <button type="button" className="btn-cancel" onClick={() => setEditingSubId(null)}>
                                Cancel
                              </button>
                              <button type="submit" className="btn-save" disabled={saving}>
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </form>
                          {!sub.is_placeholder && (unassignedUsers.length > 0 || currentSubUsers.length > 0) && (
                            <div className="manage-dept-add-users">
                              <h4>Assign users to {subName || sub.name}</h4>
                              {unassignedUsers.length > 0 && (
                                <>
                                  <p className="manage-dept-user-group-label">Unassigned</p>
                                  <ul className="unassigned-users-list">
                                    {unassignedUsers.map((u) => {
                                      const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
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
                                              {displayName !== u.username && u.username ? ` (${u.username})` : ''}
                                            </span>
                                          </label>
                                        </li>
                                      )
                                    })}
                                  </ul>
                                </>
                              )}
                              {unassignedUsers.length > 0 && currentSubUsers.length > 0 && (
                                <div className="manage-dept-user-separator" aria-hidden="true" />
                              )}
                              {currentSubUsers.length > 0 && (
                                <>
                                  <p className="manage-dept-user-group-label">Current in {subName || sub.name}</p>
                                  <ul className="unassigned-users-list">
                                    {currentSubUsers.map((u) => {
                                      const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
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
                                              {displayName !== u.username && u.username ? ` (${u.username})` : ''}
                                            </span>
                                          </label>
                                        </li>
                                      )
                                    })}
                                  </ul>
                                </>
                              )}
                              <button
                                type="button"
                                className="btn-add-users-to-dept"
                                onClick={handleSaveSubDepartmentAssignments}
                                disabled={saving}
                              >
                                {saving ? 'Saving...' : 'Save assignments'}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="manage-sub-row">
                          <span className="manage-sub-name">
                            — {sub.name}
                            {sub.is_placeholder && <span className="placeholder-badge">Unassigned</span>}
                          </span>
                          <span className="manage-sub-count">{sub.user_count} users</span>
                          {isAdmin && !sub.is_placeholder && (
                            <span className="manage-sub-actions">
                              <button type="button" className="btn-edit" onClick={() => startEditSub(sub)}>Edit</button>
                              <button type="button" className="btn-delete" onClick={() => handleDeleteSubDepartment(sub, dept.name)} disabled={saving}>Delete</button>
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
