import { cn } from '@/lib/utils'

export function StatusBadge({ status, className }) {
  const styles = {
    draft: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]',
    pending_approval: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
    approved: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
    rejected: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
  }
  const labels = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      styles[status] || styles.draft,
      className
    )}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full mr-1.5',
        status === 'approved' && 'bg-[var(--color-success)]',
        status === 'pending_approval' && 'bg-[var(--color-warning)]',
        status === 'rejected' && 'bg-[var(--color-danger)]',
        status === 'draft' && 'bg-[var(--color-text-muted)]',
      )} />
      {labels[status] || status}
    </span>
  )
}

export function WeightageBar({ current, max = 100, className }) {
  const pct = Math.min((current / max) * 100, 100)
  const isComplete = Math.abs(current - max) < 0.01
  const isOver = current > max
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-xs">
        <span className="text-[var(--color-text-secondary)]">Weightage</span>
        <span className={cn(
          'font-mono font-medium',
          isComplete ? 'text-[var(--color-success)]' : isOver ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]'
        )}>
          {Number(current).toFixed(1)}% / {max}%
        </span>
      </div>
      <div className="h-2 bg-[var(--color-bg-primary)] rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isComplete ? 'bg-[var(--color-success)]' : isOver ? 'bg-[var(--color-danger)]' : 'gradient-accent'
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

export function ScoreGauge({ score, size = 64 }) {
  const s = Number(score || 0)
  const color = s >= 80 ? 'var(--color-success)' : s >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'
  const circumference = 2 * Math.PI * 24
  const offset = circumference - (s / 100) * circumference
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r="24" fill="none" stroke="var(--color-bg-elevated)" strokeWidth="4" />
        <circle cx="28" cy="28" r="24" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{s.toFixed(0)}</span>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent-soft)] flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-[var(--color-accent)]" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--color-text-secondary)] max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}

export function Card({ children, className, ...props }) {
  return (
    <div className={cn(
      'rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-lg shadow-black/5',
      className
    )} {...props}>
      {children}
    </div>
  )
}

export function Button({ children, variant = 'primary', size = 'md', className, disabled, ...props }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'gradient-accent text-white hover:opacity-90 focus:ring-[var(--color-accent)]',
    secondary: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] focus:ring-[var(--color-border)]',
    danger: 'bg-[var(--color-danger)] text-white hover:opacity-90 focus:ring-[var(--color-danger)]',
    ghost: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] focus:ring-[var(--color-border)]',
    outline: 'border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] focus:ring-[var(--color-border)]',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2',
  }
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled} {...props}>
      {children}
    </button>
  )
}

export function Input({ label, error, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</label>}
      <input
        className={cn(
          'w-full rounded-lg border bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent',
          'transition-all duration-200',
          error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  )
}

export function Select({ label, error, options = [], className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</label>}
      <select
        className={cn(
          'w-full rounded-lg border bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent',
          error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]',
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  )
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse bg-[var(--color-bg-elevated)] rounded-lg', className)} />
}

export function Modal({ open, onClose, title, children, className }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative glass-strong rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-scale-in',
        className
      )}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
