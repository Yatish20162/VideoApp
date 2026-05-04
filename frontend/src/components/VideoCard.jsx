import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import ProgressBar from './ProgressBar'

function fmt(bytes) {
  if (!bytes) return '—'
  const mb = bytes / 1048576
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`
}
function dur(s) {
  if (!s) return null
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}
function relDate(d) {
  const diff = Date.now() - new Date(d)
  const h = diff / 3.6e6
  if (h < 1)    return 'just now'
  if (h < 24)   return `${Math.floor(h)}h ago`
  if (h < 168)  return `${Math.floor(h / 24)}d ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const STATUS_ACCENT = {
  safe:       'var(--sky)',
  flagged:    'var(--red)',
  processing: 'var(--amber)',
  error:      'var(--red)',
}

export default function VideoCard({ video, liveProgress, onDelete, canDelete }) {
  const isProcessing = video.status === 'processing'
  const pct = liveProgress?.pct ?? (isProcessing ? 0 : 100)
  const accent = STATUS_ACCENT[video.status] || 'var(--sky)'

  return (
    <div className="card card-hover anim-fade-up" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Top accent line */}
      <div style={{ height: 2, background: accent, opacity: 0.7 }} />

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.9375rem', color: 'rgba(255,255,255,0.92)',
            lineHeight: 1.35, flex: 1,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {video.title || video.originalName}
          </h3>
          <StatusBadge status={video.status} />
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            fmt(video.size),
            dur(video.duration),
            relDate(video.uploadedAt || video.createdAt),
          ].filter(Boolean).map((val, i) => (
            <span key={i} style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
              color: 'rgba(255,255,255,0.28)', letterSpacing: '0.02em',
            }}>
              {i > 0 && <span style={{ marginRight: 8, opacity: 0.4 }}>·</span>}
              {val}
            </span>
          ))}
        </div>

        {/* Progress during processing */}
        {isProcessing && (
          <ProgressBar pct={pct} label={liveProgress?.stage || 'Queued'} />
        )}

        {/* Flagged reason */}
        {video.status === 'flagged' && video.sensitivity?.reason && (
          <div style={{
            background: 'var(--red-dim)', border: '1px solid rgba(255,77,77,0.18)',
            borderRadius: 8, padding: '8px 10px',
          }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'rgba(255,100,100,0.8)', lineHeight: 1.5 }}>
              {video.sensitivity.reason}
            </p>
          </div>
        )}

        {/* Sensitivity score pill */}
        {video.sensitivity?.score != null && video.status !== 'processing' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Score
            </span>
            <div style={{
              height: 3, flex: 1, background: 'var(--rim)', borderRadius: 99, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${(video.sensitivity.score * 100).toFixed(0)}%`,
                background: video.status === 'flagged' ? 'var(--red)' : 'var(--sky)',
                opacity: 0.7,
              }} />
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
              color: video.status === 'flagged' ? 'var(--red)' : 'var(--sky)',
            }}>
              {(video.sensitivity.score * 100).toFixed(0)}%
            </span>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Actions */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          borderTop: '1px solid var(--rim)', paddingTop: '0.875rem',
          marginTop: 'auto',
        }}>
          {!isProcessing && (
            <Link to={`/player/${video._id}`} className="btn btn-sm" style={{
              flex: 1, background: 'var(--lime-dim)',
              color: 'var(--lime)', border: '1px solid rgba(200,255,0,0.15)',
            }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
                <path d="M2 1.5l7 4-7 4V1.5z"/>
              </svg>
              Play
            </Link>
          )}
          {canDelete && (
            <button onClick={() => onDelete(video._id)} className="btn btn-sm btn-danger" style={{ flexShrink: 0, padding: '0.45rem 0.7rem' }} title="Delete">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1.5 3h9M4.5 3V2h3v1M3 3v6.5a1 1 0 001 1h4a1 1 0 001-1V3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}