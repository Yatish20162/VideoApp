import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'editor' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form.name, form.email, form.password, form.role)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-acid/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-acid mb-5 glow-acid">
            <span className="font-display font-bold text-ink-950 text-2xl">VS</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl text-white mb-2">Create account</h1>
          <p className="text-white/40 font-body text-sm">Join VaultStream and start uploading</p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-ember-dim border border-ember/20 text-ember text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Full name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Jane Smith"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="label">Role</label>
              <select
                className="input-field appearance-none cursor-pointer"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              >
                <option value="viewer">Viewer — read-only access</option>
                <option value="editor">Editor — upload & manage</option>
                <option value="admin">Admin — full access</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary mt-2 font-display font-bold text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating account…
                </span>
              ) : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-acid hover:text-acid-dark transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}