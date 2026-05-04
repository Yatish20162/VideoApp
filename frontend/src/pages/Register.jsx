import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { value: 'viewer', label: 'Viewer', desc: 'Read-only access to assigned videos', icon: '👁' },
  { value: 'editor', label: 'Editor', desc: 'Upload, manage and analyze videos',   icon: '✏️' },
  { value: 'admin',  label: 'Admin',  desc: 'Full system access and user management', icon: '⚡' },
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]     = useState({ name: '', email: '', password: '', role: 'editor' ,orgName:''})
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await register(form.name, form.email, form.password, form.role ,form.orgName)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100svh', background: 'var(--ink)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,255,0,0.045) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="anim-fade-up" style={{ width: '100%', maxWidth: 460 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2.5rem', justifyContent: 'center' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, background: 'var(--lime)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 18px var(--lime-glow)',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="var(--ink)"/>
              <rect x="9" y="2" width="5" height="5" rx="1" fill="var(--ink)"/>
              <rect x="2" y="9" width="5" height="5" rx="1" fill="var(--ink)"/>
              <rect x="9" y="9" width="5" height="2.5" rx="1" fill="var(--ink)" opacity="0.5"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: '#fff' }}>VaultStream</span>
        </div>

        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>
            Create your account
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Join VaultStream and start securing your content</p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
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
              <label className="field-label">Full name</label>
              <input type="text" className="field-input" placeholder="Jane Smith"
                value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className="field-label">Email address</label>
              <input type="email" className="field-input" placeholder="you@company.com"
                value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input type="password" className="field-input" placeholder="Min. 6 characters"
                value={form.password} onChange={set('password')} required minLength={6} />
            </div>
            <div>
              <label className="field-label">Organization Name</label>
              <input
                type="text"
                className="field-input"
                placeholder="Acme Corp"
                value={form.orgName}
                onChange={set('orgName')}
                required
              />
            </div>

            {/* Role selector */}
            <div>
              <label className="field-label">Select role</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ROLES.map(r => (
                  <button type="button" key={r.value} onClick={() => setForm(f => ({ ...f, role: r.value }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      background: form.role === r.value ? 'var(--lime-dim)' : 'var(--ink-3)',
                      border: `1px solid ${form.role === r.value ? 'rgba(200,255,0,0.25)' : 'var(--rim-2)'}`,
                      transition: 'all 0.15s', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.8125rem', color: form.role === r.value ? 'var(--lime)' : 'rgba(255,255,255,0.8)' }}>
                        {r.label}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                        {r.desc}
                      </div>
                    </div>
                    {form.role === r.value && (
                      <div style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: '50%', background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l2 2L6.5 2" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg" style={{ marginTop: 4 }}>
              {loading ? (
                <>
                  <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Creating account…
                </>
              ) : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.3)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--lime)', fontWeight: 500 }}>Sign in →</Link>
        </p>
      </div>
    </div>
  )
}