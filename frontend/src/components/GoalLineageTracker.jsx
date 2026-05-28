import { useGoalLineage } from '@/lib/queries'
import { Skeleton } from '@/components/ui'
import { ChevronRight, Building2, Users, Target } from 'lucide-react'

/**
 * GoalLineageTracker — Renders the cascading OKR hierarchy chain
 * for a given goal, showing the path from organizational objective
 * down to the employee's individual target.
 *
 * [Org Objective] ➔ [Manager Key Result] ➔ [Employee Target]
 */
export default function GoalLineageTracker({ sheetId, goalId }) {
  const { data: lineage, isLoading, isError } = useGoalLineage(sheetId, goalId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 animate-fade-in">
        <Skeleton className="h-10 w-36 rounded-lg" />
        <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
        <Skeleton className="h-10 w-36 rounded-lg" />
        <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
    )
  }

  if (isError || !lineage || lineage.length <= 1) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 text-xs text-[var(--color-text-muted)] animate-fade-in">
        <Target className="w-3.5 h-3.5" />
        <span>This is a standalone goal — no hierarchy chain.</span>
      </div>
    )
  }

  // Pick icon based on position in chain
  const getNodeIcon = (index, total) => {
    if (index === 0) return Building2   // Root = Org/Dept objective
    if (index < total - 1) return Users // Middle = Manager KR
    return Target                        // Leaf = Employee target
  }

  // Pick label based on position
  const getNodeLabel = (index, total) => {
    if (index === 0) return 'Org Objective'
    if (index < total - 1) return 'Manager KR'
    return 'Your Target'
  }

  return (
    <div className="py-3 px-4 animate-fade-in">
      {/* Header */}
      <p className="text-[10px] uppercase tracking-widest font-semibold text-[var(--color-text-muted)] mb-3">
        Goal Alignment Chain
      </p>

      {/* Lineage chain */}
      <div className="flex items-stretch gap-0 overflow-x-auto pb-1 scrollbar-thin">
        {lineage.map((node, i) => {
          const Icon = getNodeIcon(i, lineage.length)
          const label = getNodeLabel(i, lineage.length)
          const isCurrentGoal = node.id === goalId
          const isLast = i === lineage.length - 1

          return (
            <div key={node.id} className="flex items-center shrink-0" style={{ animationDelay: `${i * 80}ms` }}>
              {/* Node card */}
              <div
                className={`
                  relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all duration-300
                  ${isCurrentGoal
                    ? 'gradient-accent text-white border-transparent shadow-lg shadow-[var(--color-accent)]/20'
                    : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)] hover:border-[var(--color-accent)]/40'
                  }
                `}
              >
                {/* Pulsing ring on current goal */}
                {isCurrentGoal && (
                  <span className="absolute inset-0 rounded-xl animate-[pulse-glow_2s_ease-in-out_infinite]" />
                )}

                <div className={`
                  w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                  ${isCurrentGoal
                    ? 'bg-white/20'
                    : 'bg-[var(--color-accent-soft)]'
                  }
                `}>
                  <Icon className={`w-3.5 h-3.5 ${isCurrentGoal ? 'text-white' : 'text-[var(--color-accent)]'}`} />
                </div>

                <div className="min-w-0 max-w-[160px]">
                  <p className={`text-[10px] font-medium uppercase tracking-wider ${isCurrentGoal ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`}>
                    {label}
                  </p>
                  <p className={`text-xs font-semibold truncate ${isCurrentGoal ? 'text-white' : 'text-[var(--color-text-primary)]'}`}>
                    {node.title}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${isCurrentGoal ? 'text-white/60' : 'text-[var(--color-text-muted)]'}`}>
                    {node.thrust_area} • {Number(node.weightage).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Connector arrow */}
              {!isLast && (
                <div className="flex items-center px-1.5">
                  <div className="w-4 h-px bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-info)] opacity-50" />
                  <ChevronRight className="w-4 h-4 text-[var(--color-accent)] opacity-60 -ml-1" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
