import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const linkClass = ({ isActive }) =>
    `px-3 py-1 rounded text-sm uppercase tracking-widest transition-colors ${
      isActive ? 'text-doom-orange border-b border-doom-orange' : 'text-gray-400 hover:text-white'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-doom-panel border-b border-doom-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-doom-red font-bold text-lg tracking-widest glow-red">
            💀 DOOM PLATFORM
          </span>
          <div className="flex items-center gap-6">
            <NavLink to="/dashboard"   className={linkClass}>Dashboard</NavLink>
            <NavLink to="/leaderboard" className={linkClass}>Leaderboard</NavLink>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">{user?.username}</span>
            <button onClick={handleLogout}
              className="doom-btn-outline text-xs py-1 px-3">
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
