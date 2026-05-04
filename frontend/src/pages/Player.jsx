import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import StatusBadge from '../components/StatusBadge'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function formatBytes(bytes) {
  if (!bytes) return '—'
  const mb = bytes / (1024 * 1024)
  return mb >= 1000 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
}

export default function Player() {
  const { id } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)

  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const res = await api.get(`/videos/${id}`)
        setVideo(res.data.video || res.data)
      } catch (err) {
        if (err.response?.status === 404) {
          setError('Video not found.')
        } else {
          setError('Failed to load video.')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchVideo()
  }, [id])

  // Build stream URL — include token for auth via query param as fallback
  const token = localStorage.getItem('token')
  const streamUrl = `${API_BASE}/videos/${id}/stream?token=${token}`

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="aspect-video bg-ink-800 rounded-2xl" />
          <div className="h-6 bg-ink-800 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 text-center">
        <div className="card p-12 max-w-sm mx-auto">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="font-display font-semibold text-white mb-2">{error}</p>
          <button onClick={() => navigate('/library')} className="btn-ghost mt-4 text-sm">
            ← Back to Library
          </button>
        </div>
      </div>
    )
  }

  if (video?.status === 'processing') {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 text-center">
        <div className="card p-12 max-w-sm mx-auto">
          <div className="text-4xl mb-4 animate-spin-slow">⚙️</div>
          <p className="font-display font-semibold text-white mb-2">Still processing…</p>
          <p className="text-white/40 text-sm mb-6">Come back once analysis is complete.</p>
          <Link to="/dashboard" className="btn-primary text-sm inline-block">View Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      {/* Back */}
      <Link to="/library" className="inline-flex items-center gap-2 text-xs font-mono text-white/30 hover:text-white/60 transition-colors mb-8">
        ← Library
      </Link>

      {/* Video player */}
      <div className="rounded-2xl overflow-hidden bg-black mb-8 relative group">
        <video
          ref={videoRef}
          src={streamUrl}
          controls
          className="w-full aspect-video"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>

        {/* Flagged overlay warning */}
        {video?.status === 'flagged' && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-ember/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white text-xs font-mono">
            ⚠ Flagged Content
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-1">
              <h1 className="font-display font-extrabold text-2xl text-white leading-tight">
                {video?.title || video?.filename}
              </h1>
              <p className="text-white/30 text-sm font-mono mt-1">{formatDate(video?.uploadedAt)}</p>
            </div>
            <StatusBadge status={video?.status} />
          </div>

          {video?.sensitivity?.reason && (
            <div className={`px-4 py-3 rounded-xl border text-sm font-body mb-4 ${
              video.status === 'flagged'
                ? 'bg-ember-dim border-ember/20 text-ember/80'
                : 'bg-sky-dim border-sky-pulse/20 text-sky-pulse/80'
            }`}>
              <span className="font-mono text-xs uppercase tracking-wider opacity-60">Sensitivity note: </span>
              {video.sensitivity.reason}
            </div>
          )}
        </div>

        {/* Stats sidebar */}
        <div className="card p-5 lg:w-64 space-y-4 h-fit">
          <p className="text-xs font-mono text-white/30 uppercase tracking-widest">Details</p>
          {[
            { label: 'File size', value: formatBytes(video?.size) },
            { label: 'Duration', value: formatDuration(video?.duration) },
            { label: 'Format', value: video?.mimetype?.split('/')[1]?.toUpperCase() || '—' },
            video?.sensitivity?.score != null && {
              label: 'Sensitivity score',
              value: `${(video.sensitivity.score * 100).toFixed(0)}%`,
              accent: video.status === 'flagged' ? 'text-ember' : 'text-sky-pulse',
            },
          ].filter(Boolean).map(({ label, value, accent }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-xs font-mono text-white/30">{label}</span>
              <span className={`text-xs font-mono ${accent || 'text-white/70'}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}