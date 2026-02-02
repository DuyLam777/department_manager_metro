import "./Header.css";

export function Header({
  user,
  appTitle,
  appLogoImg,
  headerBannerImg,
  onLoginClick,
  onLogout,
  onSettingsClick,
}) {
  return (
    <header className="header">
      {headerBannerImg && (
        <img src={headerBannerImg} alt="" className="header-banner-img" />
      )}
      <div className="header-title">
        {appLogoImg && (
          <img src={appLogoImg} alt="Logo" className="header-logo" />
        )}
        {appTitle || "Phần mềm quản lý nhân sự"}
      </div>

      <div className="header-actions">
        {user ? (
          <>
            {user.is_admin && (
              <button
                className="btn-settings"
                onClick={onSettingsClick}
                title="Cài đặt"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            <span className="user-name">
              {user.first_name || user.last_name
                ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                : user.username}
            </span>
            <button className="btn-logout" onClick={onLogout}>
              Đăng xuất
            </button>
          </>
        ) : (
          <button className="btn-login-header" onClick={onLoginClick}>
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  );
}
