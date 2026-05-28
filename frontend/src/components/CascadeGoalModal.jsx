import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { managerApi } from '@/lib/api'
import { useCascadeGoal } from '@/lib/queries'
import { Button } from '@/components/ui'
import { X, Users, CheckCircle2, GitMerge } from 'lucide-react'

export default function CascadeGoalModal({ isOpen, onClose, goal }) {
  // Fetch only the manager's direct reports
  const { data: team, isLoading } = useQuery({
    queryKey: ['managerTeam'],
    queryFn: async () => {
      const res = await managerApi.getTeam()
      return res.data
    },
    enabled: isOpen
  })
  
  const cascadeMutation = useCascadeGoal()
  const [selectedIds, setSelectedIds] = useState([])
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleToggle = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (selectedIds.length === 0) {
      setErrorMsg('Select at least one team member.')
      return
    }

    try {
      const response = await cascadeMutation.mutateAsync({ 
        goalId: goal.id, 
        data: { employee_ids: selectedIds } 
      })
      setSuccessMsg(`Success! ${response.message}`)
      setTimeout(() => {
        onClose()
        setSuccessMsg('')
        setSelectedIds([])
      }, 2000)
    } catch (err) {
      setErrorMsg(err.response?.data?.detail?.detail || err.response?.data?.detail || 'Failed to cascade goal.')
    }
  }

  if (!isOpen || !goal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl w-full max-w-md shadow-2xl animate-slide-up">
        
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-[var(--color-accent)]" />
            <h3 className="font-semibold">Cascade Goal to Team</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--color-bg-elevated)]"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5">
          <div className="mb-4 p-3 bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">Target Goal to Cascade:</p>
            <p className="text-sm font-semibold">{goal.title}</p>
          </div>

          <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><Users className="w-4 h-4"/> Select Direct Reports</h4>
          
          {isLoading ? (
            <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">Loading team...</div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1 border border-[var(--color-border)] rounded-lg p-2">
              {team?.map(emp => (
                <label key={emp.user_id} className="flex items-center gap-3 p-2 rounded hover:bg-[var(--color-bg-elevated)] cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(emp.user_id)}
                    onChange={() => handleToggle(emp.user_id)}
                    className="rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                  />
                  <div>
                    <p className="text-sm font-medium">{emp.full_name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{emp.department} • Active Goals: {emp.goals_count}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-elevated)] rounded-b-xl">
          <div className="flex-1 pr-4">
            {errorMsg && <p className="text-xs text-[var(--color-error)] font-medium">{errorMsg}</p>}
            {successMsg && <p className="text-xs text-[var(--color-success)] font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>{successMsg}</p>}
          </div>
          <Button onClick={handleSubmit} disabled={cascadeMutation.isPending}>
            {cascadeMutation.isPending ? 'Cascading...' : 'Cascade Goal'}
          </Button>
        </div>
      </div>
    </div>
  )
}