import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket'
import api from '../api/axios'
import StatusBadge from '../components/StatusBadge'
import ProgressBar from '../components/ProgressBar'

function StatCard({ label, value, color, icon, delay }) {
  return (
    <div className={`stat-card anim-fade-up delay-${delay}`} style={{ overflow: 'hidden' }}>
      {/* Subtle left border accent */}
      <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 2, borderRadius: 99, background: color, opacity: 0.6 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>
          {label}
        </span>
        <span style={{ fontSize: '1.1rem', opacity: 0.6 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.25rem', color, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, token } = useAuth()
  const { on } = useSocket(token)

  const [videos, setVideos]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [liveProgress, setLiveProgress] = useState({})

  useEffect(() => {
    api.get('/videos').then(r => setVideos(r.data.videos || r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const offP = on('processing:progress', ({ videoId, pct, stage }) =>
      setLiveProgress(p => ({ ...p, [videoId]: { pct, stage } })))
    const offC = on('processing:complete', ({ videoId, status, sensitivity }) => {
      setLiveProgress(p => { const n = { ...p }; delete n[videoId]; return n })
      setVideos(p => p.map(v => v._id === videoId ? { ...v, status, sensitivity } : v))
    })
    const offE = on('processing:error', ({ videoId }) => {
      setLiveProgress(p => { const n = { ...p }; delete n[videoId]; return n })
    })
    return () => { offP?.(); offC?.(); offE?.() }
  }, [on])

  const processing = videos.filter(v => v.status === 'processing')
  const safe       = videos.filter(v => v.status === 'safe').length
  const flagged    = videos.filter(v => v.status === 'flagged').length

  return (
    <div className="page-wrap">

      {/* Header */}
      <div className="anim-fade-up" style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>
          Overview
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          Welcome, {user?.name?.split(' ')[0]}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', marginTop: 6, fontSize: '0.9375rem' }}>
          Here's what's happening across your vault.
        </p>
      </div>

      {user?.role === "admin" && (
  <div
    className="anim-fade-up"
    style={{
      marginBottom: "2rem",
      padding: "1.25rem",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "12px",
      background: "rgba(255,255,255,0.02)",
    }}
  >
    <h2
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "1.1rem",
        marginBottom: "0.5rem",
      }}
    >
      Admin Controls
    </h2>

    <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>
      Manage users, assign videos, and control system access.
    </p>

    <Link
      to="/admin"
      className="btn btn-primary"
      style={{ marginTop: "10px", display: "inline-block" }}
    >
      Open Admin Panel →
    </Link>
  </div>
)}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <StatCard label="Total"      value={videos.length} color="rgba(255,255,255,0.6)" icon="📦" delay={1} />
        <StatCard label="Safe"       value={safe}          color="var(--sky)"            icon="✅" delay={2} />
        <StatCard label="Flagged"    value={flagged}       color="var(--red)"            icon="🚩" delay={3} />
        <StatCard label="Processing" value={processing.length} color="var(--amber)"     icon="⚙️" delay={4} />
      </div>

      {/* Live processing section */}
      {processing.length > 0 && (
        <div className="anim-fade-up" style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)', animation: 'blink 1.4s ease-in-out infinite' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.0625rem', color: '#fff' }}>
              Live Processing
            </h2>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--amber)', background: 'var(--amber-dim)', border: '1px solid rgba(255,176,32,0.2)', borderRadius: 99, padding: '2px 8px' }}>
              {processing.length} active
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {processing.map(video => {
              const prog = liveProgress[video._id]
              return (
                <div key={video._id} className="card" style={{ padding: '1.125rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {video.title}
                      </p>
                    </div>
                    <StatusBadge status="processing" />
                  </div>
                  <ProgressBar pct={prog?.pct ?? 0} label={prog?.stage || 'Queued…'} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent videos */}
      <div className="anim-fade-up" style={{ animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.0625rem', color: '#fff' }}>
            Recent Videos
          </h2>
          <Link to="/library" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--lime)', letterSpacing: '0.02em' }}>
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="card" style={{ overflow: 'hidden' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="table-row">
                <div className="skeleton" style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div className="skeleton" style={{ height: 12, width: '40%' }} />
                  <div className="skeleton" style={{ height: 10, width: '20%' }} />
                </div>
                <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 99 }} />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="4" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.4"/><path d="M9 8.5l5 2.5-5 2.5V8.5z" fill="currentColor" opacity="0.5"/></svg>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>No videos yet</p>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.3)' }}>Upload your first video to get started</p>
              </div>
              <Link to="/upload" className="btn btn-primary btn-sm" style={{ marginTop: 4 }}>Upload Video</Link>
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            {videos.slice(0, 6).map(video => {
              const dotColor = { safe: 'var(--sky)', flagged: 'var(--red)', error: 'var(--red)' }[video.status] || 'var(--amber)'
              return (
                <div key={video._id} className="table-row">
                  <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: dotColor, boxShadow: video.status === 'safe' ? '0 0 6px var(--sky)' : 'none' }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {video.title}
                    </p>
                    {video.sensitivity?.score != null && (
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                        score {(video.sensitivity.score * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                  <StatusBadge status={video.status} />
                  {video.status !== 'processing' && (
                    <Link to={`/player/${video._id}`} className="btn btn-sm" style={{
                      background: 'var(--lime-dim)', color: 'var(--lime)', border: '1px solid rgba(200,255,0,0.15)', flexShrink: 0,
                    }}>
                      Play
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}