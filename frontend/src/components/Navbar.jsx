import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  {
    to: '/dashboard', label: 'Dashboard',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
  {
    to: '/upload', label: 'Upload',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 10V2M4 5l3.5-3L11 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M1 12v1a1 1 0 001 1h11a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: '/library', label: 'Library',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="2" width="13" height="2.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="1" y="6.5" width="13" height="2.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="1" y="11" width="13" height="2.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
]

const ROLE_STYLES = {
  admin:  { color: 'var(--red)',   label: 'Admin' },
  editor: { color: 'var(--lime)',  label: 'Editor' },
  viewer: { color: 'var(--sky)',   label: 'Viewer' },
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }
  const role = ROLE_STYLES[user?.role] || ROLE_STYLES.viewer

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 64,
      borderBottom: '1px solid var(--rim)',
      background: 'rgba(8,9,13,0.85)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 2rem',
        width: '100%', display: 'flex', alignItems: 'center', gap: '2rem',
      }}>

        {/* Logo */}
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--lime)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px var(--lime-glow)',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="var(--ink)"/>
              <rect x="9" y="2" width="5" height="5" rx="1" fill="var(--ink)"/>
              <rect x="2" y="9" width="5" height="5" rx="1" fill="var(--ink)"/>
              <rect x="9" y="9" width="5" height="2.5" rx="1" fill="var(--ink)" opacity="0.5"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.0625rem', color: '#fff', letterSpacing: '-0.02em' }}>
            VaultStream
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          {NAV.map(({ to, label, icon }) => {
            const active = location.pathname === to
            return (
              <Link key={to} to={to} className={`nav-pill${active ? ' active' : ''}`}>
                {icon}
                {label}
              </Link>
            )
          })}
        </div>

        {/* User pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--ink-3)', border: '1px solid var(--rim-2)',
            borderRadius: 99, padding: '5px 14px 5px 8px',
          }}>
            {/* Avatar */}
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--ink-4)', border: '1.5px solid var(--rim-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '0.7rem', color: 'var(--lime)',
            }}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>
                {user?.name?.split(' ')[0]}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: role.color, lineHeight: 1.2 }}>
                {role.label}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button onClick={handleLogout} title="Sign out" style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'var(--ink-3)', border: '1px solid var(--rim-2)',
            color: 'rgba(255,255,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(255,77,77,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'var(--rim-2)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 2H2.5a1 1 0 00-1 1v8a1 1 0 001 1h3M9 9.5l2.5-2.5L9 4.5M11.5 7H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

      </div>
    </nav>
  )
}