import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket'
import api from '../api/axios'
import StatusBadge from '../components/StatusBadge'
import ProgressBar from '../components/ProgressBar'

export default function Dashboard() {
  const { user, token } = useAuth()
  const { on } = useSocket(token)

  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [liveProgress, setLiveProgress] = useState({}) // { videoId: { pct, stage } }

  // Load recent videos
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await api.get('/videos')
        setVideos(res.data.videos || res.data)
      } catch (err) {
        console.error('Failed to fetch videos:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchVideos()
  }, [])

  // Socket.io live updates
  useEffect(() => {
    const offProgress = on('processing:progress', ({ videoId, pct, stage }) => {
      setLiveProgress(prev => ({ ...prev, [videoId]: { pct, stage } }))
    })

    const offComplete = on('processing:complete', ({ videoId, status, sensitivity }) => {
      setLiveProgress(prev => {
        const next = { ...prev }
        delete next[videoId]
        return next
      })
      setVideos(prev =>
        prev.map(v => v._id === videoId ? { ...v, status, sensitivity } : v)
      )
    })

    const offError = on('processing:error', ({ videoId, message }) => {
      console.error(`[Socket] Processing error for ${videoId}:`, message)
      setLiveProgress(prev => {
        const next = { ...prev }
        delete next[videoId]
        return next
      })
    })

    return () => {
      offProgress?.()
      offComplete?.()
      offError?.()
    }
  }, [on])

  const processingVideos = videos.filter(v => v.status === 'processing')
  const safeCount = videos.filter(v => v.status === 'safe').length
  const flaggedCount = videos.filter(v => v.status === 'flagged').length

  const stats = [
    { label: 'Total Videos', value: videos.length, color: 'text-white' },
    { label: 'Safe', value: safeCount, color: 'text-sky-pulse' },
    { label: 'Flagged', value: flaggedCount, color: 'text-ember' },
    { label: 'Processing', value: processingVideos.length, color: 'text-gold' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-2">Dashboard</p>
        <h1 className="font-display font-extrabold text-4xl text-white">
          Hey, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-white/40 mt-2 font-body">Here's what's happening in your vault.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="card p-6">
            <div className={`font-display font-extrabold text-4xl ${color} mb-1`}>{value}</div>
            <div className="text-xs font-mono text-white/30 uppercase tracking-widest">{label}</div>
          </div>
        ))}
      </div>

      {/* Live Processing */}
      {processingVideos.length > 0 && (
        <div className="mb-10">
          <h2 className="font-display font-bold text-xl text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            Live Processing
          </h2>
          <div className="space-y-3">
            {processingVideos.map(video => {
              const prog = liveProgress[video._id]
              return (
                <div key={video._id} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-body text-white/80 text-sm truncate max-w-xs">
                      {video.title || video.filename}
                    </span>
                    <StatusBadge status="processing" />
                  </div>
                  <ProgressBar
                    pct={prog?.pct ?? 0}
                    label={prog?.stage || 'Queued…'}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Videos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl text-white">Recent Videos</h2>
          <Link to="/library" className="text-xs font-mono text-acid hover:text-acid-dark transition-colors">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 bg-white/5 rounded mb-3 w-2/3" />
                <div className="h-3 bg-white/5 rounded mb-5 w-1/3" />
                <div className="h-1.5 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">📹</div>
            <p className="font-display font-semibold text-white text-lg mb-2">No videos yet</p>
            <p className="text-white/40 text-sm mb-6">Upload your first video to get started.</p>
            <Link to="/upload" className="btn-primary inline-block">Upload Video</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {videos.slice(0, 5).map(video => (
              <div key={video._id} className="card px-5 py-4 flex items-center gap-4 hover:border-white/10 transition-all duration-200">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  video.status === 'safe' ? 'bg-sky-pulse' :
                  video.status === 'flagged' ? 'bg-ember' : 'bg-gold animate-pulse'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-white/80 text-sm truncate">{video.title || video.filename}</p>
                </div>
                <StatusBadge status={video.status} />
                {video.status !== 'processing' && (
                  <Link
                    to={`/player/${video._id}`}
                    className="text-xs font-mono text-acid hover:text-acid-dark transition-colors whitespace-nowrap"
                  >
                    ▶ Play
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}