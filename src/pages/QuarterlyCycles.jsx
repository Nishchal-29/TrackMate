import { useCycles, useCreateCycle } from '@/lib/queries'
import { useState } from 'react'
import { Card, Button, Input, Select, EmptyState, Skeleton, Modal } from '@/components/ui'
import { Settings, Plus, Calendar, Info } from 'lucide-react'

// Updated to match the BRD explicitly
const PERIOD_OPTIONS = [
  { value: 'Phase 1', label: 'Phase 1 — Goal Setting' },
  { value: 'Q1 Check-in', label: 'Q1 Check-in' },
  { value: 'Q2 Check-in', label: 'Q2 Check-in' },
  { value: 'Q3 Check-in', label: 'Q3 Check-in' },
  { value: 'Q4 / Annual', label: 'Q4 / Annual' },
]

// Hardcoded reference table for Admin guidance
const SCHEDULE_GUIDELINES = [
  { period: 'Phase 1 — Goal Setting', opens: '1st May', action: 'Goal Creation, Submission & Approval' },
  { period: 'Q1 Check-in', opens: 'July', action: 'Progress Update — Planned vs. Actual' },
  { period: 'Q2 Check-in', opens: 'October', action: 'Progress Update — Planned vs. Actual' },
  { period: 'Q3 Check-in', opens: 'January', action: 'Progress Update — Planned vs. Actual' },
  { period: 'Q4 / Annual', opens: 'March / April', action: 'Final Achievement Capture' },
]

export default function QuarterlyCycles() {
  const { data: cycles, isLoading } = useCycles()
  const createCycle = useCreateCycle()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    financial_year: 'FY2025-26', quarter: 'Phase 1',
    tracking_opens_at: '', tracking_closes_at: '', is_active: true,
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleCreate = async () => {
    try {
      await createCycle.mutateAsync({
        ...form,
        tracking_opens_at: new Date(form.tracking_opens_at).toISOString(),
        tracking_closes_at: new Date(form.tracking_closes_at).toISOString(),
      })
      setShowCreate(false)
      setForm({ financial_year: 'FY2025-26', quarter: 'Phase 1', tracking_opens_at: '', tracking_closes_at: '', is_active: true })
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create cycle')
    }
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quarterly Cycles</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Configure achievement tracking windows</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" /> New Cycle
        </Button>
      </div>

      {/* Official Guidelines Table (Matches the BRD Image) */}
      <Card className="bg-[var(--color-bg-primary)] border-[var(--color-border)]">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold">Official Check-in Schedule Guidelines</h3>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border-subtle)]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#71A5E6] text-[#0f172a]">
              <tr>
                <th className="py-2 px-3 font-semibold">Period</th>
                <th className="py-2 px-3 font-semibold">Window Opens</th>
                <th className="py-2 px-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {SCHEDULE_GUIDELINES.map((row, i) => (
                <tr key={i} className="hover:bg-[var(--color-bg-elevated)] transition-colors">
                  <td className="py-2 px-3 font-medium">{row.period}</td>
                  <td className="py-2 px-3">{row.opens}</td>
                  <td className="py-2 px-3 text-[var(--color-text-secondary)]">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Configured Cycles List */}
      {!cycles || cycles.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No cycles configured"
          description="Create quarterly cycles to enable achievement tracking for your employees."
          action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create First Cycle</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cycles.map((c, i) => (
            <Card key={c.id} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{c.quarter}</h3>
                  <span className="text-xs text-[var(--color-text-muted)]">— {c.financial_year}</span>
                  <span className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-[var(--color-success)]' : 'bg-[var(--color-text-muted)]'}`} />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 text-xs text-[var(--color-text-secondary)]">
                <div className="flex justify-between">
                  <span>Opens</span>
                  <span className="font-mono">{new Date(c.tracking_opens_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Closes</span>
                  <span className="font-mono">{new Date(c.tracking_closes_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Cycle Window">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Financial Year" value={form.financial_year} onChange={e => set('financial_year', e.target.value)} />
            <Select label="Period" value={form.quarter} onChange={e => set('quarter', e.target.value)} options={PERIOD_OPTIONS} />
          </div>
          <Input label="Tracking Opens" type="datetime-local" value={form.tracking_opens_at} onChange={e => set('tracking_opens_at', e.target.value)} />
          <Input label="Tracking Closes" type="datetime-local" value={form.tracking_closes_at} onChange={e => set('tracking_closes_at', e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={createCycle.isPending}>Create Cycle</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}