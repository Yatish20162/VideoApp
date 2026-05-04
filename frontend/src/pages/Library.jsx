import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket'
import api from '../api/axios'
import VideoCard from '../components/VideoCard'

const FILTERS = [
  { value: '',           label: 'All'        },
  { value: 'safe',       label: 'Safe'       },
  { value: 'flagged',    label: 'Flagged'    },
  { value: 'processing', label: 'Processing' },
]

export default function Library() {
  const { user, token } = useAuth()
  const { on } = useSocket(token)

  const [videos,       setVideos]       = useState([])
  const [filter,       setFilter]       = useState('')
  const [loading,      setLoading]      = useState(true)
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

  useEffect(() => { fetchVideos(filter) }, [filter])

  useEffect(() => {
    const offP = on('processing:progress', ({ videoId, pct, stage }) =>
      setLiveProgress(p => ({ ...p, [videoId]: { pct, stage } })))
    const offC = on('processing:complete', ({ videoId, status, sensitivity }) => {
      setLiveProgress(p => { const n = { ...p }; delete n[videoId]; return n })
      setVideos(p => p.map(v => v._id === videoId ? { ...v, status, sensitivity } : v))
    })
    return () => { offP?.(); offC?.() }
  }, [on])

  const handleDelete = async id => {
    if (!window.confirm('Delete this video? This cannot be undone.')) return
    try {
      await api.delete(`/videos/${id}`)
      setVideos(p => p.filter(v => v._id !== id))
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.')
    }
  }

  const FILTER_ACCENT = { safe: 'var(--sky)', flagged: 'var(--red)', processing: 'var(--amber)' }

  return (
    <div className="page-wrap">

      {/* Header */}
      <div className="anim-fade-up" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>
            Library
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', color: '#fff', letterSpacing: '-0.03em' }}>
            Your Videos
          </h1>
        </div>

        {/* Filter bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3,
          background: 'var(--ink-2)', border: '1px solid var(--rim)',
          borderRadius: 12, padding: 4,
        }}>
          {FILTERS.map(({ value, label }) => {
            const active  = filter === value
            const accent  = FILTER_ACCENT[value]
            return (
              <button key={value} onClick={() => setFilter(value)} style={{
                padding: '6px 14px', borderRadius: 8, cursor: 'pointer', border: 'none',
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.04em',
                fontWeight: active ? 600 : 400,
                background: active ? (accent ? `${accent}18` : 'var(--rim-2)') : 'transparent',
                color: active ? (accent || '#fff') : 'rgba(255,255,255,0.4)',
                outline: active && accent ? `1px solid ${accent}30` : 'none',
                transition: 'all 0.15s',
              }}>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div className="skeleton" style={{ height: 14, width: '55%' }} />
                <div className="skeleton" style={{ height: 22, width: 65, borderRadius: 99 }} />
              </div>
              <div className="skeleton" style={{ height: 10, width: '30%', marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 2, width: '100%', borderRadius: 99 }} />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon" style={{ width: 64, height: 64, fontSize: '1.75rem', borderRadius: 18 }}>
              {filter === 'flagged' ? '🚩' : filter === 'safe' ? '✅' : filter === 'processing' ? '⚙️' : '📂'}
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                {filter ? `No ${filter} videos` : 'Library is empty'}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.3)' }}>
                {filter ? 'Try a different filter.' : 'Upload your first video to get started.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {videos.map((video, i) => (
              <VideoCard
                key={video._id}
                video={video}
                liveProgress={liveProgress[video._id]}
                onDelete={handleDelete}
                canDelete={canDelete}
                style={{ animationDelay: `${i * 0.04}s` }}
              />
            ))}
          </div>
          <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', marginTop: '2rem', letterSpacing: '0.04em' }}>
            {videos.length} video{videos.length !== 1 ? 's' : ''}
            {filter ? ` · filtered by "${filter}"` : ''}
          </p>
        </>
      )}
    </div>
  )
}