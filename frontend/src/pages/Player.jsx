import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import StatusBadge from '../components/StatusBadge'

/**
 * The stream URL includes the JWT token as a query param because the browser's
 * native <video> element cannot set custom Authorization headers on the src URL.
 * The backend protect middleware accepts ?token= as a fallback for this reason.
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtBytes = (b) => {
  if (!b) return '—'
  const mb = b / 1_048_576
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`
}

const fmtDur = (s) => {
  if (!s) return '—'
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`
}

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

// ── Sub-components ────────────────────────────────────────────────────────────
function MetaRow({ label, value, valueStyle }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '0.625rem 0', borderBottom: '1px solid var(--rim)',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'rgba(255,255,255,0.28)',
      }}>{label}</span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
        color: 'rgba(255,255,255,0.75)', textAlign: 'right', ...valueStyle,
      }}>{value}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Player() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)

  const [video,        setVideo]        = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [streamError,  setStreamError]  = useState(false)  // video element failed to load
  const [isFullscreen, setIsFullscreen] = useState(false)

  // ── Build stream URL with token in query param ──────────────────────────────
  // This is necessary because <video src="..."> cannot send Authorization headers.
  // The backend protect middleware reads ?token= as a fallback for stream routes.
  const token     = localStorage.getItem('token')
  const streamUrl = token
    ? `${API_BASE}/videos/${id}/stream?token=${encodeURIComponent(token)}`
    : `${API_BASE}/videos/${id}/stream`

  // ── Fetch video metadata ────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    setError('')
    setStreamError(false)

    api.get(`/videos/${id}`)
      .then((r) => setVideo(r.data.video || r.data))
      .catch((e) => {
        if (e.response?.status === 404) setError('Video not found.')
        else if (e.response?.status === 403) setError('You do not have access to this video.')
        else setError('Failed to load video metadata.')
      })
      .finally(() => setLoading(false))
  }, [id])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  // Space → play/pause | f → fullscreen | ArrowLeft/Right → seek ±5s
  const handleKeyDown = useCallback((e) => {
    const el = videoRef.current
    if (!el) return
    // Don't capture when focus is on an input/button
    if (['INPUT', 'TEXTAREA', 'BUTTON', 'A'].includes(e.target.tagName)) return

    switch (e.key) {
      case ' ':
        e.preventDefault()
        el.paused ? el.play() : el.pause()
        break
      case 'ArrowLeft':
        e.preventDefault()
        el.currentTime = Math.max(0, el.currentTime - 5)
        break
      case 'ArrowRight':
        e.preventDefault()
        el.currentTime = Math.min(el.duration || 0, el.currentTime + 5)
        break
      case 'f':
      case 'F':
        e.preventDefault()
        if (!document.fullscreenElement) {
          el.requestFullscreen?.()
        } else {
          document.exitFullscreen?.()
        }
        break
      case 'm':
      case 'M':
        e.preventDefault()
        el.muted = !el.muted
        break
      default:
        break
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Track fullscreen state for UI
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="page-wrap" style={{ maxWidth: 1040 }}>
      <div className="skeleton" style={{ aspectRatio: '16/9', width: '100%', borderRadius: 16, marginBottom: 24 }} />
      <div className="skeleton" style={{ height: 28, width: '40%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 14, width: '20%' }} />
    </div>
  )

  // ── Metadata fetch error ────────────────────────────────────────────────────
  if (error) return (
    <div className="page-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: 340 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff', marginBottom: 6 }}>{error}</p>
        <button
          onClick={() => navigate('/library')}
          className="btn btn-ghost btn-sm"
          style={{ marginTop: '1rem' }}
        >
          ← Back to Library
        </button>
      </div>
    </div>
  )

  // ── Still processing ────────────────────────────────────────────────────────
  if (video?.status === 'processing') return (
    <div className="page-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: 360 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 16,
          background: 'var(--amber-dim)', border: '1px solid rgba(255,176,32,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem', fontSize: '1.75rem',
        }}>⚙️</div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff', fontSize: '1.1rem', marginBottom: 6 }}>
          Still processing…
        </p>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
          Track real-time progress on the Dashboard.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Link to="/dashboard" className="btn btn-primary btn-sm">View Dashboard</Link>
          {/* Refresh metadata to catch status changes */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setLoading(true); api.get(`/videos/${id}`).then(r => setVideo(r.data.video || r.data)).finally(() => setLoading(false)) }}
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )

  // ── Processing errored ──────────────────────────────────────────────────────
  if (video?.status === 'error') return (
    <div className="page-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💔</div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff', marginBottom: 6 }}>
          Processing Failed
        </p>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
          This video could not be processed. Try uploading it again.
        </p>
        <button onClick={() => navigate('/library')} className="btn btn-ghost btn-sm">
          ← Back to Library
        </button>
      </div>
    </div>
  )

  const isFlagged = video?.status === 'flagged'

  // ── Main player view ────────────────────────────────────────────────────────
  return (
    <div className="page-wrap anim-fade-in" style={{ maxWidth: 1040 }}>

      {/* Back link */}
      <Link
        to="/library"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.35)', marginBottom: '1.5rem',
          transition: 'color 0.2s', textDecoration: 'none',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        Library
      </Link>

      {/* ── Video player ────────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden',
        background: '#000', marginBottom: '1.5rem',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>

        {/* Flagged warning overlay on the player */}
        {isFlagged && (
          <div style={{
            position: 'absolute', top: 14, left: 14, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,77,77,0.85)', backdropFilter: 'blur(8px)',
            borderRadius: 8, padding: '5px 10px',
            fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#fff',
            pointerEvents: 'none',
          }}>
            ⚠ Flagged Content
          </div>
        )}

        {/* Keyboard hint — shown briefly */}
        <div style={{
          position: 'absolute', bottom: 60, right: 14, zIndex: 10,
          fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
          color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
          lineHeight: 1.8,
        }}>
          Space · Play/Pause &nbsp;·&nbsp; ← → · Seek 5s &nbsp;·&nbsp; F · Fullscreen &nbsp;·&nbsp; M · Mute
        </div>

        {/*
          ── The <video> element ───────────────────────────────────────────────
          src points to GET /api/videos/:id/stream?token=<jwt>
          The browser sends Range headers automatically for seeking.
          The backend responds with 206 Partial Content for each chunk.

          crossOrigin="use-credentials" is NOT set because the token is in the
          query param, not a cookie — CORS credentials aren't needed here.
        */}
        <video
          ref={videoRef}
          src={streamUrl}
          controls
          preload="metadata"
          className="anim-fade-in"
          style={{ width: '100%', aspectRatio: '16/9', display: 'block' }}
          onError={(e) => {
            console.error('Video stream error:', e)
            setStreamError(true)
          }}
          onCanPlay={() => setStreamError(false)}
        >
          Your browser does not support the video tag.
        </video>

        {/* Stream-level error overlay (shown if <video> itself fails) */}
        {streamError && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
            gap: 12,
          }}>
            <span style={{ fontSize: '2rem' }}>📡</span>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
              color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 280,
            }}>
              Could not load video stream.<br/>Check your connection or try refreshing.
            </p>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setStreamError(false)
                // Re-set src to force reload
                if (videoRef.current) {
                  videoRef.current.load()
                }
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* ── Info section ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'start' }}>

        {/* Left — title + sensitivity note */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: '0.875rem' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', color: '#fff',
              letterSpacing: '-0.02em', flex: 1, lineHeight: 1.2,
            }}>
              {video?.title || video?.originalName}
            </h1>
            <StatusBadge status={video?.status} />
          </div>

          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.3)', marginBottom: '1rem', letterSpacing: '0.02em',
          }}>
            {fmtDate(video?.uploadedAt || video?.createdAt)}
          </p>

          {/* Sensitivity reason bubble */}
          {video?.sensitivity?.reason && (
            <div style={{
              background: isFlagged ? 'var(--red-dim)' : 'var(--sky-dim)',
              border: `1px solid ${isFlagged ? 'rgba(255,77,77,0.2)' : 'rgba(56,217,245,0.2)'}`,
              borderRadius: 10, padding: '10px 14px',
            }}>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                color: isFlagged ? 'rgba(255,110,110,0.9)' : 'rgba(56,217,245,0.9)',
                lineHeight: 1.6,
              }}>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.6 }}>
                  Sensitivity ·{' '}
                </span>
                {video.sensitivity.reason}
              </p>
            </div>
          )}
        </div>

        {/* Right — stats panel */}
        <div className="card" style={{ padding: '1.25rem', minWidth: 220, flexShrink: 0 }}>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.25)', marginBottom: '0.5rem',
          }}>
            File details
          </p>
          <MetaRow label="Size"     value={fmtBytes(video?.size)} />
          <MetaRow label="Duration" value={fmtDur(video?.duration)} />
          <MetaRow label="Format"   value={video?.mimetype?.split('/')[1]?.toUpperCase() || '—'} />
          {video?.sensitivity?.score != null && (
            <MetaRow
              label="Score"
              value={`${(video.sensitivity.score * 100).toFixed(0)}%`}
              valueStyle={{ color: isFlagged ? 'var(--red)' : 'var(--sky)' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}