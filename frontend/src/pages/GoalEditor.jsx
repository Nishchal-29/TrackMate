import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSheet, useAddGoal, useUpdateGoal, useDeleteGoal, useSubmitSheet } from '@/lib/queries'
import { Card, Button, Input, Select, StatusBadge, WeightageBar, Modal, EmptyState, Skeleton } from '@/components/ui'
import { Plus, Trash2, Edit3, Send, Lock, ArrowLeft, GripVertical, CheckCircle, Info } from 'lucide-react'

const UOM_OPTIONS = [
  { value: 'numeric', label: 'Numeric (e.g. revenue, units)' },
  { value: 'percentage', label: 'Percentage (e.g. growth %)' },
  { value: 'timeline', label: 'Timeline (date-based)' },
  { value: 'zero_based', label: 'Zero-based (binary)' },
]

function GoalForm({ onSubmit, onCancel, initial }) {
  const [form, setForm] = useState(initial || {
    thrust_area: '', title: '', description: '', uom_type: 'numeric',
    target_value: '', weightage: '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Thrust Area" value={form.thrust_area} onChange={e => set('thrust_area', e.target.value)} placeholder="e.g. Revenue" />
        <Select label="UoM Type" value={form.uom_type} onChange={e => set('uom_type', e.target.value)} options={UOM_OPTIONS} />
      </div>
      <Input label="Goal Title" value={form.title} onChange={e => set('title', e.target.value)} placeholder="What do you want to achieve?" />
      <Input label="Description (optional)" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Add more context..." />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Target Value" type="number" value={form.target_value} onChange={e => set('target_value', e.target.value)} placeholder="e.g. 500000" />
        <Input label="Weightage (%)" type="number" value={form.weightage} onChange={e => set('weightage', e.target.value)} placeholder="Min 10, max 100" />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onSubmit(form)}>
          {initial ? 'Update Goal' : 'Add Goal'}
        </Button>
      </div>
    </div>
  )
}

export default function GoalEditor() {
  const { sheetId } = useParams()
  const navigate = useNavigate()
  const { data: sheet, isLoading } = useSheet(sheetId)
  const addGoal = useAddGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const submitSheet = useSubmitSheet()

  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)

  const isDraft = sheet?.status === 'draft'
  const totalWeightage = sheet?.goals?.reduce((s, g) => s + Number(g.weightage), 0) || 0
  const canSubmit = isDraft && sheet?.goals?.length >= 1 && Math.abs(totalWeightage - 100) < 0.01

  // Dynamic Validation Rule Checks
  const hasValidGoalCount = sheet?.goals?.length > 0 && sheet?.goals?.length <= 8;
  const hasValidTotalWeightage = Math.abs(totalWeightage - 100) < 0.01;
  const hasValidMinWeightage = sheet?.goals?.length > 0 && sheet.goals.every(g => Number(g.weightage) >= 10);

  const handleAddGoal = async (data) => {
    if (Number(data.weightage) < 10) {
      alert("Weightage must be at least 10%.");
      return;
    }
    try {
      await addGoal.mutateAsync({ sheetId, data: { ...data, target_value: data.target_value ? Number(data.target_value) : null, weightage: Number(data.weightage) } })
      setShowForm(false)
    } catch (err) {
      const detail = err.response?.data?.detail;
      // If it's an array (FastAPI validation error), map through and extract the messages
      if (Array.isArray(detail)) {
        alert(detail.map(e => e.msg).join('\n'));
      } else {
        alert(detail?.detail || detail || 'Failed to add goal');
      }
    }
  }

  const handleUpdateGoal = async (data) => {
    try {
      const updates = {}
      if (data.title) updates.title = data.title
      if (data.description !== undefined) updates.description = data.description
      if (data.thrust_area) updates.thrust_area = data.thrust_area
      if (data.weightage) updates.weightage = Number(data.weightage)
      if (data.target_value) updates.target_value = Number(data.target_value)
      if (data.uom_type) updates.uom_type = data.uom_type
      await updateGoal.mutateAsync({ sheetId, goalId: editGoal.id, data: updates })
      setEditGoal(null)
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        alert(detail.map(e => e.msg).join('\n'));
      } else {
        alert(detail?.detail || detail || 'Failed to update goal');
      }
    }
  }

  const handleDelete = async (goalId) => {
    if (!confirm('Delete this goal?')) return
    try {
      await deleteGoal.mutateAsync({ sheetId, goalId })
    } catch (err) {
      alert(err.response?.data?.detail?.detail || 'Failed to delete goal')
    }
  }

  const handleSubmit = async () => {
    try {
      await submitSheet.mutateAsync(sheetId)
      setShowSubmitConfirm(false)
      navigate('/')
    } catch (err) {
      const detail = err.response?.data?.detail
      alert(detail?.detail || detail || 'Submission failed')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-24" /><Skeleton className="h-24" />
      </div>
    )
  }

  if (!sheet) return <EmptyState icon={Lock} title="Sheet not found" description="This goal sheet doesn't exist or you don't have access." />

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{sheet.financial_year} — Goal Sheet</h1>
            <StatusBadge status={sheet.status} />
            {sheet.locked && <Lock className="w-3.5 h-3.5 text-[var(--color-warning)]" />}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {sheet.goals.length}/8 goals • Created {new Date(sheet.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {isDraft && sheet.goals.length < 8 && (
            <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Goal
            </Button>
          )}
          {isDraft && (
            <Button size="sm" disabled={!canSubmit} onClick={() => setShowSubmitConfirm(true)}>
              <Send className="w-3.5 h-3.5" /> Submit
            </Button>
          )}
        </div>
      </div>

      {/* Validation Rules Checklist */}
      <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3 text-[var(--color-text-secondary)]">
          <Info className="w-4 h-4" />
          <h3 className="text-xs font-semibold uppercase tracking-wider">Validation Rules</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className={`flex items-center gap-2 transition-colors duration-300 ${hasValidTotalWeightage ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
            <CheckCircle className="w-4 h-4" />
            <span>Total weightage equals exactly 100%</span>
          </div>
          <div className={`flex items-center gap-2 transition-colors duration-300 ${hasValidMinWeightage ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
            <CheckCircle className="w-4 h-4" />
            <span>Min. 10% weightage per goal</span>
          </div>
          <div className={`flex items-center gap-2 transition-colors duration-300 ${hasValidGoalCount ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
            <CheckCircle className="w-4 h-4" />
            <span>Between 1 and 8 goals maximum</span>
          </div>
        </div>
      </div>

      {/* Weightage bar */}
      <WeightageBar current={totalWeightage} />

      {/* Add goal form */}
      {showForm && (
        <Card className="animate-slide-up border-[var(--color-accent)] border-dashed">
          <h3 className="text-sm font-semibold mb-3">New Goal</h3>
          <GoalForm onSubmit={handleAddGoal} onCancel={() => setShowForm(false)} />
        </Card>
      )}

      {/* Goals list */}
      {sheet.goals.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No goals yet"
          description="Add your first goal to get started. You need between 1-8 goals with total weightage of 100%."
          action={isDraft && <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Add First Goal</Button>}
        />
      ) : (
        <div className="space-y-3">
          {sheet.goals
            .sort((a, b) => a.order_index - b.order_index)
            .map((goal, i) => (
              <Card key={goal.id} className="group hover:border-[var(--color-accent)]/30 transition-all animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                {editGoal?.id === goal.id ? (
                  <GoalForm
                    initial={{ thrust_area: goal.thrust_area, title: goal.title, description: goal.description || '', uom_type: goal.uom_type, target_value: goal.target_value || '', weightage: goal.weightage }}
                    onSubmit={handleUpdateGoal}
                    onCancel={() => setEditGoal(null)}
                  />
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 pt-0.5">
                      <GripVertical className="w-4 h-4 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="w-6 h-6 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center text-[10px] font-bold text-[var(--color-accent)]">
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold truncate">{goal.title}</h3>
                        {goal.is_title_locked && <Lock className="w-3 h-3 text-[var(--color-warning)]" />}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-secondary)]">
                        <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg-primary)]">{goal.thrust_area}</span>
                        <span>{goal.uom_type}</span>
                        {goal.target_value && <span>Target: {Number(goal.target_value).toLocaleString()}</span>}
                      </div>
                      {goal.description && <p className="text-xs text-[var(--color-text-muted)] mt-1.5 line-clamp-2">{goal.description}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-bold gradient-text">{Number(goal.weightage).toFixed(0)}%</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">weightage</p>
                      </div>
                      {isDraft && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditGoal(goal)} className="p-1.5 rounded hover:bg-[var(--color-bg-elevated)] transition-colors">
                            <Edit3 className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                          </button>
                          {!goal.parent_goal_id && (
                            <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded hover:bg-[var(--color-danger-soft)] transition-colors">
                              <Trash2 className="w-3.5 h-3.5 text-[var(--color-danger)]" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
        </div>
      )}

      {/* Submit confirmation */}
      <Modal open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)} title="Submit Goal Sheet?">
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-[var(--color-bg-primary)]">
            <div className="flex justify-between text-sm">
              <span>Goals</span><span className="font-mono">{sheet.goals.length}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span>Total Weightage</span>
              <span className={`font-mono ${canSubmit ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                {totalWeightage.toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Once submitted, this sheet will be sent to your manager for approval. You won't be able to edit it until it's rejected or unlocked.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowSubmitConfirm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitSheet.isPending}>
              <CheckCircle className="w-3.5 h-3.5" /> Confirm Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}