import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useMySheets, useCreateSheet } from '@/lib/queries'
import { Card, Button, StatusBadge, WeightageBar, EmptyState, Skeleton } from '@/components/ui'
import { Target, Plus, ArrowRight, FileText } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: sheets, isLoading } = useMySheets()
  const createSheet = useCreateSheet()

  const handleCreate = async () => {
    try {
      const sheet = await createSheet.mutateAsync({ financial_year: 'FY2025-26' })
      navigate(`/goals/${sheet.id}`)
    } catch (err) {
      alert(err.response?.data?.detail?.detail || 'Failed to create sheet')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  const activeSheet = sheets?.find(s => s.status !== 'rejected')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Track your goals and achievements</p>
        </div>
        {!activeSheet && (
          <Button onClick={handleCreate} disabled={createSheet.isPending}>
            <Plus className="w-4 h-4" />
            New Goal Sheet
          </Button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="group hover:border-[var(--color-accent)] transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-soft)] flex items-center justify-center">
              <FileText className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sheets?.length || 0}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Goal Sheets</p>
            </div>
          </div>
        </Card>
        <Card className="group hover:border-[var(--color-success)] transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-success-soft)] flex items-center justify-center">
              <Target className="w-5 h-5 text-[var(--color-success)]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeSheet?.goals?.length || 0}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Active Goals</p>
            </div>
          </div>
        </Card>
        <Card className="group hover:border-[var(--color-warning)] transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-warning-soft)] flex items-center justify-center">
              <Target className="w-5 h-5 text-[var(--color-warning)]" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {activeSheet?.goals?.reduce((s, g) => s + Number(g.weightage), 0).toFixed(0) || 0}%
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">Total Weightage</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active sheet */}
      {activeSheet ? (
        <Card className="animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">{activeSheet.financial_year}</h2>
                <StatusBadge status={activeSheet.status} />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {activeSheet.goals.length} goal{activeSheet.goals.length !== 1 ? 's' : ''} •
                Created {new Date(activeSheet.created_at).toLocaleDateString()}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/goals/${activeSheet.id}`)}>
              View Goals <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <WeightageBar
            current={activeSheet.goals.reduce((s, g) => s + Number(g.weightage), 0)}
            className="mb-4"
          />

          {/* Goal list preview */}
          <div className="space-y-2">
            {activeSheet.goals.slice(0, 4).map((goal, i) => (
              <div key={goal.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-bg-primary)]">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-[var(--color-text-muted)] w-5">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{goal.title}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{goal.thrust_area}</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-[var(--color-accent)] shrink-0">{Number(goal.weightage).toFixed(0)}%</span>
              </div>
            ))}
            {activeSheet.goals.length > 4 && (
              <p className="text-xs text-center text-[var(--color-text-muted)] pt-1">
                +{activeSheet.goals.length - 4} more goals
              </p>
            )}
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={Target}
          title="No Active Goal Sheet"
          description="Create a new goal sheet to start tracking your performance goals for this financial year."
          action={
            <Button onClick={handleCreate} disabled={createSheet.isPending}>
              <Plus className="w-4 h-4" /> Create Goal Sheet
            </Button>
          }
        />
      )}
    </div>
  )
}
