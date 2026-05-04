export default function StatusBadge({ status }) {
    if (status === 'safe') {
      return (
        <span className="badge-safe">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-pulse animate-pulse-slow" />
          Safe
        </span>
      )
    }
    if (status === 'flagged') {
      return (
        <span className="badge-flagged">
          <span className="w-1.5 h-1.5 rounded-full bg-ember" />
          Flagged
        </span>
      )
    }
    return (
      <span className="badge-processing">
        <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
        Processing
      </span>
    )
  }