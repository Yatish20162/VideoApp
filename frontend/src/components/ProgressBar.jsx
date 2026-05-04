export default function ProgressBar({ pct = 0, label, style = {} }) {
  const clamped = Math.min(100, Math.max(0, pct))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label !== undefined && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.04em',
          }}>
            {label}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--lime)',
            fontWeight: 500,
          }}>
            {Math.round(clamped)}%
          </span>
        </div>
      )}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}