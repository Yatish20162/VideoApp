export default function StatusBadge({ status }) {
  const configs = {
    safe: {
      cls: 'badge badge-safe',
      dot: { background: 'var(--sky)', boxShadow: '0 0 6px var(--sky)' },
      label: 'Safe',
    },
    flagged: {
      cls: 'badge badge-flagged',
      dot: { background: 'var(--red)' },
      label: 'Flagged',
    },
    error: {
      cls: 'badge badge-error',
      dot: { background: 'var(--red)' },
      label: 'Error',
    },
    processing: {
      cls: 'badge badge-processing',
      dot: { background: 'var(--amber)', animation: 'blink 1.4s ease-in-out infinite' },
      label: 'Processing',
    },
  }

  const c = configs[status] || configs.processing

  return (
    <span className={c.cls}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, ...c.dot }} />
      {c.label}
    </span>
  )
}