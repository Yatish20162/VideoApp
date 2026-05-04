import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { to: '/upload', label: 'Upload', icon: '↑' },
  { to: '/library', label: 'Library', icon: '▤' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleColor = {
    admin: 'text-ember',
    editor: 'text-acid',
    viewer: 'text-sky-pulse',
  }[user?.role] || 'text-white/40'

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-acid flex items-center justify-center">
            <span className="text-ink-950 font-display font-bold text-sm">VS</span>
          </div>
          <span className="font-display font-bold text-white text-lg tracking-tight">
            VaultStream
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ to, label, icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm transition-all duration-200 ${
                  active
                    ? 'bg-white/8 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <span className="font-mono text-xs">{icon}</span>
                {label}
              </Link>
            )
          })}
        </div>

        {/* User info */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-body text-white/80">{user?.name}</div>
            <div className={`text-xs font-mono uppercase tracking-widest ${roleColor}`}>
              {user?.role}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:text-ember hover:border-ember/40 transition-all duration-200"
            title="Logout"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  )
}