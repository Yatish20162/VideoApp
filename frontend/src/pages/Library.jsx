import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket'
import api from '../api/axios'
import VideoCard from '../components/VideoCard'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'safe', label: '🟢 Safe' },
  { value: 'flagged', label: '🔴 Flagged' },
  { value: 'processing', label: '🟡 Processing' },
]

export default function Library() {
  const { user, token } = useAuth()
  const { on } = useSocket(token)

  const [videos, setVideos] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [liveProgress, setLiveProgress] = useState({})

  const canDelete = ['editor', 'admin'].includes(user?.role)

  const fetchVideos = async (status = '') => {
    setLoading(true)
    try {
      const res = await api.get(`/videos${status ? `?status=${status}` : ''}`)
      setVideos(res.data.videos || res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos(filter)
  }, [filter])

  // Socket updates
  useEffect(() => {
    const offProgress = on('processing:progress', ({ videoId, pct, stage }) => {
      setLiveProgress(prev => ({ ...prev, [videoId]: { pct, stage } }))
    })
    const offComplete = on('processing:complete', ({ videoId, status, sensitivity }) => {
      setLiveProgress(prev => { const n = { ...prev }; delete n[videoId]; return n })
      setVideos(prev => prev.map(v => v._id === videoId ? { ...v, status, sensitivity } : v))
    })
    return () => { offProgress?.(); offComplete?.() }
  }, [on])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this video? This cannot be undone.')) return
    try {
      await api.delete(`/videos/${id}`)
      setVideos(prev => prev.filter(v => v._id !== id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-2">Library</p>
          <h1 className="font-display font-extrabold text-4xl text-white">Your Videos</h1>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-ink-800 border border-white/5 rounded-xl p-1">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition-all duration-200 whitespace-nowrap ${
                filter === value
                  ? 'bg-acid text-ink-950 font-bold'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-white/5 rounded mb-3 w-2/3" />
              <div className="h-3 bg-white/5 rounded mb-5 w-1/3" />
              <div className="h-1.5 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="card p-16 text-center max-w-sm mx-auto">
          <div className="text-5xl mb-4">
            {filter === 'flagged' ? '🚩' : filter === 'safe' ? '✅' : '📂'}
          </div>
          <p className="font-display font-semibold text-white text-lg mb-2">
            {filter ? `No ${filter} videos` : 'Empty library'}
          </p>
          <p className="text-white/40 text-sm">
            {filter ? 'Try a different filter.' : 'Upload your first video to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map(video => (
            <VideoCard
              key={video._id}
              video={video}
              liveProgress={liveProgress[video._id]}
              onDelete={handleDelete}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}

      {/* Count */}
      {!loading && videos.length > 0 && (
        <p className="text-center text-xs font-mono text-white/20 mt-8">
          {videos.length} video{videos.length !== 1 ? 's' : ''}
          {filter ? ` · filtered by "${filter}"` : ''}
        </p>
      )}
    </div>
  )
}