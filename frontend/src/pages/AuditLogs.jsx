import { useState } from 'react'
import { useAuditLogs } from '@/lib/queries'
import { Card, EmptyState, Skeleton } from '@/components/ui'
import { ClipboardList, ChevronDown, ChevronRight } from 'lucide-react'

const ACTION_COLORS = {
  create: 'text-[var(--color-success)]',
  update: 'text-[var(--color-info)]',
  delete: 'text-[var(--color-danger)]',
  submit: 'text-[var(--color-warning)]',
  approve: 'text-[var(--color-success)]',
  reject: 'text-[var(--color-danger)]',
  unlock: 'text-[var(--color-accent)]',
}

function AuditRow({ log }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border-b border-[var(--color-border-subtle)]">
      <div
        className="flex items-center gap-3 py-3 px-4 hover:bg-[var(--color-bg-primary)] transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="text-[var(--color-text-muted)]">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <span className={`text-xs font-mono font-medium uppercase w-16 ${ACTION_COLORS[log.action] || 'text-[var(--color-text-secondary)]'}`}>
          {log.action}
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]">
          {log.entity_type}
        </span>
        <span className="text-xs text-[var(--color-text-muted)] font-mono truncate flex-1">
          {log.entity_id?.slice(0, 8)}...
        </span>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {log.actor_role}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)] font-mono w-36 text-right">
          {new Date(log.timestamp).toLocaleString()}
        </span>
      </div>
      {expanded && (
        <div className="px-12 pb-3 animate-fade-in">
          <div className="rounded-lg bg-[var(--color-bg-primary)] p-3 text-xs space-y-1.5">
            <div className="flex gap-2"><span className="text-[var(--color-text-muted)] w-16">Actor ID</span><span className="font-mono">{log.actor_id}</span></div>
            <div className="flex gap-2"><span className="text-[var(--color-text-muted)] w-16">Entity ID</span><span className="font-mono">{log.entity_id}</span></div>
            {log.reason && <div className="flex gap-2"><span className="text-[var(--color-text-muted)] w-16">Reason</span><span>{log.reason}</span></div>}
            {log.ip_address && <div className="flex gap-2"><span className="text-[var(--color-text-muted)] w-16">IP</span><span className="font-mono">{log.ip_address}</span></div>}
            {log.delta && (
              <div>
                <span className="text-[var(--color-text-muted)]">Delta</span>
                <pre className="mt-1 p-2 rounded bg-[var(--color-bg-secondary)] text-[10px] font-mono overflow-x-auto">
                  {JSON.stringify(log.delta, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuditLogs() {
  const [page, setPage] = useState(1)
  const { data: logs, isLoading } = useAuditLogs({ page, page_size: 20 })

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">System-wide mutation tracking</p>
      </div>

      {!logs || logs.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No audit logs" description="No mutations have been recorded yet." />
      ) : (
        <>
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]">
              <div className="flex items-center gap-3 text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                <span className="w-5" />
                <span className="w-16">Action</span>
                <span>Entity</span>
                <span className="flex-1">ID</span>
                <span>Role</span>
                <span className="w-36 text-right">Timestamp</span>
              </div>
            </div>
            {logs.map(log => <AuditRow key={log.id} log={log} />)}
          </Card>

          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border)] disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-xs text-[var(--color-text-muted)]">Page {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={logs.length < 20}
              className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border)] disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
