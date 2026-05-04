import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import ProgressBar from './ProgressBar'

function formatBytes(bytes) {
  if (!bytes) return '—'
  const mb = bytes / (1024 * 1024)
  return mb >= 1000 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

export default function VideoCard({ video, liveProgress, onDelete, canDelete }) {
  const isProcessing = video.status === 'processing'
  const pct = liveProgress?.pct ?? (isProcessing ? 0 : 100)

  return (
    <div className="card group relative overflow-hidden animate-slide-up hover:border-white/10 transition-all duration-300">
      {/* Top stripe color by status */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 ${
          video.status === 'safe' ? 'bg-sky-pulse' :
          video.status === 'flagged' ? 'bg-ember' : 'bg-gold'
        }`}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-white text-base leading-tight truncate">
              {video.title || video.filename}
            </h3>
            <p className="text-xs font-mono text-white/30 mt-1">{formatDate(video.uploadedAt)}</p>
          </div>
          <StatusBadge status={video.status} />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4 text-xs font-mono text-white/30">
          <span>{formatBytes(video.size)}</span>
          {video.duration && <span>· {formatDuration(video.duration)}</span>}
          {video.sensitivity?.score != null && (
            <span className={video.status === 'flagged' ? 'text-ember' : 'text-sky-pulse'}>
              · score {(video.sensitivity.score * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {/* Progress bar during processing */}
        {isProcessing && (
          <ProgressBar pct={pct} label={liveProgress?.stage || 'Analyzing…'} className="mb-4" />
        )}

        {/* Sensitivity reason if flagged */}
        {video.status === 'flagged' && video.sensitivity?.reason && (
          <div className="mb-4 px-3 py-2 bg-ember-dim rounded-lg border border-ember/20">
            <p className="text-xs text-ember/80 font-mono">{video.sensitivity.reason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-white/5">
          {video.status !== 'processing' && (
            <Link
              to={`/player/${video._id}`}
              className="flex-1 text-center text-xs font-mono text-acid hover:text-acid-dark transition-colors py-2 rounded-lg hover:bg-acid/5"
            >
              ▶ Play
            </Link>
          )}
          <Link
            to={`/library/${video._id}`}
            className="flex-1 text-center text-xs font-mono text-white/40 hover:text-white transition-colors py-2 rounded-lg hover:bg-white/5"
          >
            Details
          </Link>
          {canDelete && (
            <button
              onClick={() => onDelete(video._id)}
              className="w-8 h-8 rounded-lg border border-white/5 flex items-center justify-center text-white/20 hover:text-ember hover:border-ember/30 transition-all duration-200"
              title="Delete"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 3h9M5 3V2h3v1M4 3v7a1 1 0 001 1h3a1 1 0 001-1V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}