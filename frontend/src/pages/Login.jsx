import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(form.email, form.password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--ink)',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Left — branding panel */}
      <div style={{
        flex: '0 0 44%',
        background: 'var(--ink-1)',
        borderRight: '1px solid var(--rim)',
        display: 'flex', flexDirection: 'column',
        padding: '3rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,255,0,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--lime)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px var(--lime-glow)',
          }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="var(--ink)"/>
              <rect x="9" y="2" width="5" height="5" rx="1" fill="var(--ink)"/>
              <rect x="2" y="9" width="5" height="5" rx="1" fill="var(--ink)"/>
              <rect x="9" y="9" width="5" height="2.5" rx="1" fill="var(--ink)" opacity="0.5"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.0625rem', color: '#fff' }}>VaultStream</span>
        </div>

        {/* Tagline */}
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', color: '#fff',
            lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '1rem',
          }}>
            Intelligent<br />video security<br />
            <span style={{ color: 'var(--lime)' }}>at scale.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.65, maxWidth: 320 }}>
            Upload, analyze, and stream video content with real-time sensitivity classification and role-based access.
          </p>
        </div>

        {/* Feature pills */}
        {['Real-time processing', 'Content sensitivity analysis', 'Secure streaming'].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--lime-dim)', border: '1px solid rgba(200,255,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 4.5l2 2L7.5 2" stroke="var(--lime)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)' }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Right — form panel */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '3rem 2rem',
      }}>
        <div className="anim-fade-up" style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>
              Welcome back
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M7.5 4.5v3.5M7.5 10h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div>
              <label className="field-label">Email address</label>
              <input type="email" className="field-input" placeholder="you@company.com"
                value={form.email} onChange={set('email')} required autoComplete="email" />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input type="password" className="field-input" placeholder="••••••••"
                value={form.password} onChange={set('password')} required autoComplete="current-password" />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg" style={{ marginTop: 6 }}>
              {loading ? (
                <>
                  <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.3)' }}>
            No account?{' '}
            <Link to="/register" style={{ color: 'var(--lime)', fontWeight: 500 }}>Create one →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}