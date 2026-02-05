# Metro Department Manager - Frontend

React frontend for the Metro Department Manager application built with Vite.

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: CSS modules
- **Image Processing**: react-easy-crop
- **Node**: 22+

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Server runs at http://localhost:5173
# API requests are proxied to http://localhost:8000
```

## Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Docker

```bash
docker build -t metro-dept-frontend .
docker run -p 3000:3000 metro-dept-frontend
```

## Project Structure

```
frontend/
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Main application component
│   ├── App.css               # Main styles
│   ├── index.css             # Global styles
│   ├── components/
│   │   ├── Header.jsx        # App header with user info
│   │   ├── Header.css
│   │   ├── LoginModal.jsx    # Admin login form
│   │   ├── LoginModal.css
│   │   ├── UserDetailModal.jsx    # View/edit user details
│   │   ├── UserDetailModal.css
│   │   ├── AddUserModal.jsx       # Create new user form
│   │   ├── AddUserModal.css
│   │   ├── ManageDepartmentsModal.jsx  # Department management
│   │   ├── ManageDepartmentsModal.css
│   │   ├── DeletedItemsModal.jsx  # View/restore deleted items
│   │   ├── DeletedItemsModal.css
│   │   ├── ImageCropModal.jsx     # Profile image cropping
│   │   ├── ImageCropModal.css
│   │   ├── SettingsModal.jsx      # App settings
│   │   └── SettingsModal.css
│   └── hooks/
│       └── useAuth.js        # Authentication hook
├── public/                   # Static assets
├── package.json
├── vite.config.js            # Vite config with API proxy
├── nginx.conf                # Nginx config for Docker
├── Dockerfile
└── README.md
```

## Features

### Authentication
- Admin login modal with JWT token management
- Session persistence
- Protected routes and actions

### Department Management
- Hierarchical tree view with expandable departments
- Create, edit, and delete departments
- Sub-department management
- Drag-and-drop reordering
- View and restore deleted departments

### User Management
- List users with search and filtering
- Create new users with role assignment
- Edit user profiles and details
- Upload and crop profile images
- Assign users to departments or sub-departments
- Password management for admin users
- View and restore deleted users

### View Modes
- View by department hierarchy
- View by location
- View all users

### Search & Filtering
- Search users by name, email, or position
- Filter by department or sub-department
- Department search

## Configuration

The Vite dev server proxies `/api/` requests to the backend. Configure the proxy target in `vite.config.js`:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

## Production Deployment

The Docker build uses a multi-stage process:
1. Node.js builds the React application
2. Nginx serves the static files and proxies API requests

Nginx configuration handles:
- Serving static files from `/usr/share/nginx/html`
- Proxying `/api/` requests to the backend
- SPA routing (fallback to index.html)
