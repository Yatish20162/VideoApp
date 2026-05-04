import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import ProgressBar from '../components/ProgressBar'

const MAX_SIZE  = 500 * 1024 * 1024
const fmt = b => { const mb = b / 1048576; return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB` }

export default function Upload() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [file,       setFile]       = useState(null)
  const [title,      setTitle]      = useState('')
  const [dragging,   setDragging]   = useState(false)
  const [uploadPct,  setUploadPct]  = useState(0)
  const [uploading,  setUploading]  = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState(null)

  const canUpload = ['editor', 'admin'].includes(user?.role)

  const validate = f => {
    if (!f.type.startsWith('video/')) return 'Only video files are allowed.'
    if (f.size > MAX_SIZE)            return 'File exceeds the 500 MB limit.'
    return null
  }

  const pickFile = useCallback(f => {
    const err = validate(f)
    if (err) { setError(err); return }
    setError(''); setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }, [title])

  const handleDrop      = useCallback(e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f) }, [pickFile])
  const handleDragOver  = e  => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  const handleUpload = async () => {
    if (!file) return
    setUploading(true); setError(''); setUploadPct(0)
    const fd = new FormData()
    fd.append('video', file)
    fd.append('title', title || file.name)
    try {
      const res = await api.post('/videos/upload', fd, {
        onUploadProgress: e => setUploadPct(Math.round((e.loaded / e.total) * 100)),
      })
      setSuccess(res.data); setFile(null); setTitle(''); setUploadPct(0)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  if (!canUpload) {
    return (
      <div className="page-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: 360 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--red-dim)', border: '1px solid rgba(255,77,77,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '1.5rem' }}>
            🔒
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff', marginBottom: 8 }}>Access Restricted</h2>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>You need Editor or Admin role to upload videos.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap" style={{ maxWidth: 720 }}>

      {/* Header */}
      <div className="anim-fade-up" style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>
          Upload
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', color: '#fff', letterSpacing: '-0.03em' }}>
          Add a new video
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', marginTop: 6, fontSize: '0.9rem' }}>
          MP4, MOV, AVI, WebM · Max 500 MB · Content is automatically analyzed
        </p>
      </div>

      {/* ── Success ── */}
      {success && (
        <div className="card anim-fade-up" style={{ padding: '2rem', borderColor: 'rgba(56,217,245,0.2)', background: 'var(--sky-dim)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(56,217,245,0.15)', border: '1px solid rgba(56,217,245,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9l4.5 4.5L15 5" stroke="var(--sky)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff', marginBottom: 2 }}>Upload successful</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                ID: {success.video?._id}
              </p>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.25rem' }}>
            Your video is being analyzed for content sensitivity. Track progress in real-time on the Dashboard.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/dashboard')} className="btn btn-primary btn-sm">View Dashboard</button>
            <button onClick={() => setSuccess(null)}       className="btn btn-ghost btn-sm">Upload Another</button>
          </div>
        </div>
      )}

      {!success && (
        <>
          {/* ── Drop zone ── */}
          <label
            htmlFor="video-upload"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`drop-zone anim-fade-up${dragging ? ' active' : ''}`}
            style={{
              display: 'block',
              padding: file ? '1.75rem 2rem' : '4rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '1.25rem',
              transition: 'all 0.2s var(--ease-out)',
            }}
          >
            <input id="video-upload" type="file" accept="video/*" style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) pickFile(e.target.files[0]) }} />

            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', textAlign: 'left' }}>
                {/* File icon */}
                <div style={{
                  width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                  background: 'var(--lime-dim)', border: '1px solid rgba(200,255,0,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="3" y="2" width="16" height="18" rx="3" stroke="var(--lime)" strokeWidth="1.4"/>
                    <path d="M9 9l5 2.5L9 14V9z" fill="var(--lime)" opacity="0.7"/>
                  </svg>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: '#fff', fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                    {fmt(file.size)}
                  </p>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); e.preventDefault(); setFile(null); setTitle('') }}
                  className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: 'var(--ink-3)', border: '1px solid var(--rim-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M11 4v12M6 9l5-5 5 5M3 19h16" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem', color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                  Drop your video here
                </p>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.25)' }}>
                  or <span style={{ color: 'var(--lime)', fontWeight: 500 }}>browse files</span>
                </p>
              </>
            )}
          </label>

          {/* ── Title input ── */}
          {file && (
            <div className="anim-fade-up" style={{ marginBottom: '1.25rem' }}>
              <label className="field-label">Video title</label>
              <input type="text" className="field-input" placeholder="Give it a descriptive name…"
                value={title} onChange={e => setTitle(e.target.value)} />
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M7.5 4.5v3.5M7.5 10h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          {/* ── Upload progress ── */}
          {uploading && (
            <div className="anim-fade-up" style={{ marginBottom: '1.25rem' }}>
              <ProgressBar pct={uploadPct} label="Uploading…" />
            </div>
          )}

          {/* ── Submit ── */}
          <button onClick={handleUpload} disabled={!file || uploading} className="btn btn-primary btn-full btn-lg anim-fade-up">
            {uploading ? (
              <>
                <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Uploading {uploadPct}%…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v8M4 7l4-4 4 4M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Upload &amp; Analyze
              </>
            )}
          </button>
        </>
      )}
    </div>
  )
}