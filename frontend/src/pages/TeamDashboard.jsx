import { useState } from 'react'
import { useTeam, useApproveSheet, useRejectSheet, useUnlockSheet, useEmployeeSheet } from '@/lib/queries'
import { useAuth } from '@/lib/auth'
import { useMsal } from "@azure/msal-react" // Swapped from useAuth
import { Card, Button, StatusBadge, EmptyState, Skeleton, Modal, Input } from '@/components/ui'
import { Users, CheckCircle, XCircle, Eye, Lock, Unlock, UserCheck, Briefcase, Shield } from 'lucide-react'

// ── Sheet Preview Modal Content ──────────────────────────────
function SheetPreview({ empId, onApprove, onReject, isAdmin }) {
  const { data: sheet, isLoading } = useEmployeeSheet(empId)

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
  }

  if (!sheet || !sheet.goals) {
    return <EmptyState title="No details available" description="Could not load the goal sheet details." />
  }

  const isPending = sheet.status === 'pending_approval'

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="flex justify-between items-center mb-4">
        <StatusBadge status={sheet.status} />
        <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
          Total Weightage: {sheet.goals.reduce((s, g) => s + Number(g.weightage), 0)}%
        </span>
      </div>

      <div className="space-y-3">
        {sheet.goals.sort((a, b) => a.order_index - b.order_index).map((goal, i) => (
          <Card key={goal.id} className="bg-[var(--color-bg-primary)]">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--color-text-muted)]">#{i + 1}</span>
                  <h4 className="text-sm font-semibold truncate">{goal.title}</h4>
                  {goal.is_title_locked && <Lock className="w-3 h-3 text-[var(--color-warning)]" />}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider">
                  <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)]">{goal.thrust_area}</span>
                  <span>•</span>
                  <span>{goal.uom_type.replace('_', ' ')}</span>
                  {goal.target_value && <span>• Target: {Number(goal.target_value).toLocaleString()}</span>}
                </div>
                {goal.description && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-2 line-clamp-2">{goal.description}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold gradient-text">{Number(goal.weightage).toFixed(0)}%</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isPending && (
        <div className="sticky bottom-0 pt-4 pb-1 bg-gradient-to-t from-[var(--color-bg-secondary)] via-[var(--color-bg-secondary)] to-transparent flex gap-2 justify-end mt-4">
          <Button variant="danger" size="sm" onClick={() => onReject(sheet.id)}>
            <XCircle className="w-4 h-4" /> Reject
          </Button>
          <Button size="sm" onClick={() => onApprove(sheet.id)}>
            <CheckCircle className="w-4 h-4" /> Approve Sheet
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Reusable Team Table ──────────────────────────────────────
function TeamTable({ members, title, icon: Icon, iconColor, onPreview, onApprove, onReject, onUnlock, isAdmin }) {
  if (!members || members.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg bg-[var(--color-${iconColor}-soft)] flex items-center justify-center`}>
          <Icon className={`w-4 h-4 text-[var(--color-${iconColor})]`} />
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          {title}
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
          {members.length}
        </span>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Department</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Sheet Status</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Goals</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Weightage</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Avg Score</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, i) => (
                <tr key={member.user_id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-primary)] transition-colors animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center text-xs font-bold text-[var(--color-accent)]">
                        {member.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium">{member.full_name}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[var(--color-text-secondary)]">{member.department || '—'}</td>
                  <td className="py-3 px-4">
                    {member.sheet_status
                      ? <StatusBadge status={member.sheet_status} />
                      : <span className="text-xs text-[var(--color-text-muted)] italic">No sheet</span>
                    }
                  </td>
                  <td className="py-3 px-4 text-center font-mono">{member.goals_count}</td>
                  <td className="py-3 px-4 text-center font-mono">{Number(member.total_weightage).toFixed(0)}%</td>
                  <td className="py-3 px-4 text-center font-mono">
                    {member.avg_score != null
                      ? <span className="text-[var(--color-success)] font-semibold">{Number(member.avg_score).toFixed(1)}</span>
                      : <span className="text-[var(--color-text-muted)]">—</span>
                    }
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-end">
                      {/* Preview — always available if sheet exists */}
                      {member.sheet_status && (
                        <Button variant="ghost" size="sm" onClick={() => onPreview(member)} title="Preview Goals">
                          <Eye className="w-4 h-4 text-[var(--color-accent)]" />
                        </Button>
                      )}

                      {/* Approve/Reject — only for pending_approval */}
                      {member.sheet_status === 'pending_approval' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => onApprove(member.sheet_id)} title="Approve">
                            <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => onReject(member.sheet_id)} title="Reject">
                            <XCircle className="w-4 h-4 text-[var(--color-danger)]" />
                          </Button>
                        </>
                      )}

                      {/* Unlock — only for approved sheets, admin only */}
                      {isAdmin && ['approved', 'rejected'].includes(member.sheet_status) && (
                        <Button variant="ghost" size="sm" onClick={() => onUnlock(member.sheet_id)} title="Unlock Sheet">
                          <Unlock className="w-4 h-4 text-[var(--color-warning)]" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ── Main TeamDashboard ───────────────────────────────────────
export default function TeamDashboard() {
  const { data: team, isLoading } = useTeam()
  
  // Microsoft Entra ID Role Check
  const { user } = useAuth() // Fetches local auth
  const { accounts } = useMsal() // Fetches Azure AD auth  
  const msalRole = accounts[0]?.idTokenClaims?.roles?.[0]?.toLowerCase()
  const isAdmin = msalRole === 'admin' || user?.role === 'admin'

  const approveSheet = useApproveSheet()
  const rejectSheet = useRejectSheet()
  const unlockSheet = useUnlockSheet()

  const [previewEmp, setPreviewEmp] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [unlockModal, setUnlockModal] = useState(null)
  const [reason, setReason] = useState('')

  // Handlers
  const handleApprove = async (sheetId) => {
    if (!confirm('Approve this goal sheet?')) return
    try {
      await approveSheet.mutateAsync(sheetId)
      setPreviewEmp(null)
    } catch (err) {
      alert(err.response?.data?.detail?.detail || err.response?.data?.detail || 'Failed to approve')
    }
  }

  const handleRejectClick = (sheetId) => {
    setRejectModal(sheetId)
  }

  const submitReject = async () => {
    if (!reason.trim()) { alert('Please provide a reason'); return }
    try {
      await rejectSheet.mutateAsync({ id: rejectModal, reason })
      setRejectModal(null)
      setPreviewEmp(null)
      setReason('')
    } catch (err) {
      alert(err.response?.data?.detail?.detail || err.response?.data?.detail || 'Failed to reject')
    }
  }

  const handleUnlockClick = (sheetId) => {
    setUnlockModal(sheetId)
  }

  const submitUnlock = async () => {
    if (!reason.trim()) { alert('Please provide a reason'); return }
    try {
      await unlockSheet.mutateAsync({ id: unlockModal, reason })
      setUnlockModal(null)
      setReason('')
    } catch (err) {
      alert(err.response?.data?.detail?.detail || err.response?.data?.detail || 'Failed to unlock')
    }
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>
  }

  // Separate by pending action vs others for quick stats
  const pending = team?.filter(m => m.sheet_status === 'pending_approval') || []
  const approved = team?.filter(m => m.sheet_status === 'approved') || []
  const drafts = team?.filter(m => m.sheet_status === 'draft') || []
  const noSheet = team?.filter(m => !m.sheet_status) || []

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{isAdmin ? 'Organization Team View' : 'My Team'}</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {isAdmin
            ? 'View and manage all employee and manager goal sheets across the organization'
            : 'Review and manage your direct reports\' goal sheets'
          }
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: team?.length || 0, icon: Users, color: 'accent' },
          { label: 'Pending Review', value: pending.length, icon: Eye, color: 'warning' },
          { label: 'Approved', value: approved.length, icon: CheckCircle, color: 'success' },
          { label: 'Draft', value: drafts.length, icon: UserCheck, color: 'info' },
          { label: 'No Sheet', value: noSheet.length, icon: XCircle, color: 'danger' },
        ].map(stat => (
          <Card key={stat.label} className="hover:border-[var(--color-border)] transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg bg-[var(--color-${stat.color}-soft)] flex items-center justify-center`}>
                <stat.icon className={`w-4.5 h-4.5 text-[var(--color-${stat.color})]`} />
              </div>
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {(!team || team.length === 0) && (
        <EmptyState icon={Users} title="No team members" description="No employees or managers found." />
      )}

      {/* Pending Approval Section — highlighted at top */}
      {pending.length > 0 && (
        <div className="p-4 rounded-xl border-2 border-dashed border-[var(--color-warning)] bg-[var(--color-warning-soft)]">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-[var(--color-warning)]" />
            <span className="text-sm font-semibold text-[var(--color-warning)]">
              {pending.length} sheet{pending.length > 1 ? 's' : ''} awaiting your review
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {pending.map(m => (
              <div key={m.user_id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center text-[10px] font-bold text-[var(--color-accent)]">
                    {m.full_name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{m.full_name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{m.goals_count} goals</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewEmp(m)} title="Preview">
                    <Eye className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleApprove(m.sheet_id)} title="Approve">
                    <CheckCircle className="w-3.5 h-3.5 text-[var(--color-success)]" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRejectClick(m.sheet_id)} title="Reject">
                    <XCircle className="w-3.5 h-3.5 text-[var(--color-danger)]" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employees section */}
      <TeamTable
        members={team?.filter(m => m.sheet_status) || []}
        title="Goal Sheets"
        icon={Briefcase}
        iconColor="accent"
        onPreview={setPreviewEmp}
        onApprove={handleApprove}
        onReject={handleRejectClick}
        onUnlock={handleUnlockClick}
        isAdmin={isAdmin}
      />

      {/* No sheet section */}
      {noSheet.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-danger-soft)] flex items-center justify-center">
              <XCircle className="w-4 h-4 text-[var(--color-danger)]" />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              No Goal Sheet Created
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
              {noSheet.length}
            </span>
          </div>
          <Card>
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {noSheet.map(m => (
                <div key={m.user_id} className="flex items-center gap-3 py-2.5 px-4">
                  <div className="w-7 h-7 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center text-[10px] font-bold text-[var(--color-text-muted)]">
                    {m.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.full_name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{m.email}</p>
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)]">{m.department || '—'}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Preview modal */}
      {previewEmp && (
        <Modal open={!!previewEmp} onClose={() => setPreviewEmp(null)} title={`${previewEmp.full_name}'s Goal Sheet`}>
          <SheetPreview
            empId={previewEmp.user_id}
            onApprove={handleApprove}
            onReject={handleRejectClick}
            isAdmin={isAdmin}
          />
        </Modal>
      )}

      {/* Reject reason modal */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Goal Sheet">
        <div className="space-y-4">
          <Input label="Reason for rejection" value={reason} onChange={e => setReason(e.target.value)} placeholder="Provide feedback..." autoFocus />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={submitReject} disabled={rejectSheet.isPending}>
              <XCircle className="w-3.5 h-3.5" /> Confirm Reject
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unlock reason modal (admin only) */}
      <Modal open={!!unlockModal} onClose={() => setUnlockModal(null)} title="Unlock Goal Sheet">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Unlocking will allow the employee to edit their approved goal sheet. A reason is required for the audit trail.
          </p>
          <Input label="Reason for unlocking" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Mid-year KPI adjustment..." autoFocus />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setUnlockModal(null)}>Cancel</Button>
            <Button size="sm" onClick={submitUnlock} disabled={unlockSheet.isPending}>
              <Unlock className="w-3.5 h-3.5" /> Confirm Unlock
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}