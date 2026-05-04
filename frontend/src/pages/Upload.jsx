import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import ProgressBar from '../components/ProgressBar'

const MAX_SIZE_BYTES = 500 * 1024 * 1024 // 500MB
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']

export default function Upload() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const canUpload = ['editor', 'admin'].includes(user?.role)

  const validateFile = (f) => {
    console.log("TYPE:", f.type)
  
    if (!f.type.startsWith('video/')) {
      return 'Only video files are supported.'
    }
  
    if (f.size > MAX_SIZE_BYTES) {
      return 'File exceeds the 500 MB limit.'
    }
  
    return null
  }

  const handleFile = useCallback((f) => {
    console.log("📁 File selected:", f)
  
    const err = validateFile(f)
    if (err) {
      console.log("❌ Validation error:", err)
      setError(err)
      return
    }
  
    setError('')
    setFile(f)
  
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }, [title])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  const formatBytes = (b) => {
    const mb = b / (1024 * 1024)
    return mb >= 1000 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`
  }

  const handleUpload = async () => {
    console.log("upload")
    if (!file) return
    setUploading(true)
    setError('')
    setUploadPct(0)

    const formData = new FormData()
    formData.append('video', file)
    formData.append('title', title || file.name)

    try {
      const res = await api.post('/videos/upload', formData, {
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / e.total) * 100)
          setUploadPct(pct)
        },
      })
      setSuccess(res.data)
      setFile(null)
      setTitle('')
      setUploadPct(0)
    } catch (err) {
      console.log("UPLOAD ERROR:", err)
      console.log("RESPONSE:", err.response)

      setError(
        err.response?.data?.message ||
        err.message ||
        'Upload failed. Please try again.'
      )
    } finally {
      setUploading(false)
    }
  }

  if (!canUpload) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10 text-center">
        <div className="card p-12 max-w-md mx-auto">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="font-display font-bold text-white text-xl mb-2">Access Restricted</h2>
          <p className="text-white/40 text-sm">You need Editor or Admin role to upload videos.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
      <div className="mb-10">
        <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-2">Upload</p>
        <h1 className="font-display font-extrabold text-4xl text-white">Add a video</h1>
        <p className="text-white/40 mt-2 font-body">Supports MP4, MOV, AVI, WebM · Max 500 MB</p>
      </div>

      {/* Success state */}
      {success && (
        <div className="card p-6 border-sky-pulse/20 bg-sky-dim mb-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-sky-pulse/20 flex items-center justify-center text-sky-pulse">✓</div>
            <div>
              <p className="font-display font-semibold text-white">Upload successful!</p>
              <p className="text-xs text-white/40 font-mono">Video ID: {success.videoId}</p>
            </div>
          </div>
          <p className="text-sm text-white/60 font-body mb-4">Your video is now being analyzed. You can track progress in the dashboard.</p>
          <div className="flex gap-3">
            <button onClick={() => navigate('/dashboard')} className="btn-primary text-sm py-2 px-4">
              View Dashboard
            </button>
            <button onClick={() => setSuccess(null)} className="btn-ghost text-sm py-2 px-4">
              Upload Another
            </button>
          </div>
        </div>
      )}

      {!success && (
        <>
          {/* Drop zone */}
          <label
            htmlFor="video-upload"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`card border-dashed border-2 border-white/10 p-12 text-center cursor-pointer mb-6 transition-all duration-200
              ${dragging ? 'drop-zone-active' : 'hover:border-white/20'}`}
          >
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                console.log("✅ INPUT TRIGGERED")
                if (e.target.files[0]) {
                  handleFile(e.target.files[0])
                }
              }}
            />

            {file ? (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-acid/10 border border-acid/20 flex items-center justify-center mx-auto">
                  <span className="text-2xl">🎬</span>
                </div>
                <div>
                  <p className="font-display font-semibold text-white text-lg">{file.name}</p>
                  <p className="text-sm font-mono text-white/30 mt-1">{formatBytes(file.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setTitle('') }}
                  className="text-xs font-mono text-ember hover:text-ember/70 transition-colors"
                >
                  × Remove
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/30">
                    <path d="M12 4v12M6 10l6-6 6 6M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="font-display font-semibold text-white">Drop your video here</p>
                  <p className="text-sm text-white/30 mt-1">or click to browse files</p>
                </div>
              </div>
            )}
          </label>

          {/* Title input */}
          {file && (
            <div className="mb-6 animate-slide-up">
              <label className="label">Video title</label>
              <input
                type="text"
                className="input-field"
                placeholder="Give it a name…"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-ember-dim border border-ember/20 text-ember text-sm">
              {error}
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="mb-6 animate-slide-up">
              <ProgressBar pct={uploadPct} label="Uploading…" />
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full btn-primary text-base"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Uploading {uploadPct}%…
              </span>
            ) : 'Upload & Analyze'}
          </button>
        </>
      )}
    </div>
  )
}