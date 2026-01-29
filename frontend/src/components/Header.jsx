import './Header.css'

export function Header({ user, onLoginClick, onLogout, onDeletedUsersClick }) {
  return (
    <header className="header">
      <div className="header-title">AnhBi User Management</div>
      
      <div className="header-actions">
        {user ? (
          <>
            {user.is_admin && (
              <button className="btn-deleted-users" onClick={onDeletedUsersClick}>
                Deleted Users
              </button>
            )}
            <span className="user-name">{user.username}</span>
            <button className="btn-logout" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <button className="btn-login-header" onClick={onLoginClick}>
            Login
          </button>
        )}
      </div>
    </header>
  )
}
