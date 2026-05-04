export default function ProgressBar({ pct = 0, label, className = '' }) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {label && (
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-white/40">{label}</span>
            <span className="text-xs font-mono text-acid">{Math.round(pct)}%</span>
          </div>
        )}
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="progress-bar-fill h-full rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
      </div>
    )
  }