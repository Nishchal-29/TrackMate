import { useState } from 'react'
import { useUsers, usePushGoal } from '@/lib/queries'
import { Button } from '@/components/ui'
import { X, Send, Users, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function PushGoalModal({ isOpen, onClose }) {
  const { data: users, isLoading: usersLoading } = useUsers()
  const pushGoalMutation = usePushGoal()
  
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  
  // Filter for active employees only
  const eligibleEmployees = users?.filter(u => u.is_active && (u.role === 'user' || u.role === 'manager')) || []

  const [formData, setFormData] = useState({
    thrust_area: 'Revenue',
    title: '',
    description: '',
    uom_type: 'numeric',
    target_value: '',
    target_date: '',
    financial_year: 'FY2025-26',
    employee_ids: []
  })

  const handleToggleEmployee = (id) => {
    setFormData(prev => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(id)
        ? prev.employee_ids.filter(empId => empId !== id)
        : [...prev.employee_ids, id]
    }))
  }

  const selectAll = () => {
    setFormData(prev => ({ ...prev, employee_ids: eligibleEmployees.map(e => e.id) }))
  }

  const clearAll = () => {
    setFormData(prev => ({ ...prev, employee_ids: [] }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (formData.employee_ids.length === 0) {
      setErrorMsg('Please select at least one employee.')
      return
    }

    try {
      const payload = {
        ...formData,
        target_value: Number(formData.target_value)
      }
      const response = await pushGoalMutation.mutateAsync(payload)
      setSuccessMsg(`Success! ${response.message}`)
      
      // Auto-close after 2 seconds on success
      setTimeout(() => {
        onClose()
        setSuccessMsg('')
        setFormData({ ...formData, title: '', description: '', target_value: '', target_date: '', employee_ids: [] })
      }, 2000)
    } catch (err) {
      setErrorMsg(err.response?.data?.detail?.detail || err.response?.data?.detail || 'Failed to push goal.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[var(--color-accent)]" />
            <h3 className="font-semibold text-lg">Push Shared KPI (Cascading OKR)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: Goal Details */}
          <form id="push-goal-form" onSubmit={handleSubmit} className="space-y-4">
            <h4 className="font-medium text-sm border-b border-[var(--color-border)] pb-2 mb-3">Goal Details</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Financial Year</label>
                <input type="text" value={formData.financial_year} disabled className="w-full text-sm p-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-elevated)] opacity-70" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Thrust Area</label>
                <select 
                  value={formData.thrust_area} 
                  onChange={e => setFormData({...formData, thrust_area: e.target.value})}
                  className="w-full text-sm p-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] outline-none"
                >
                  <option value="Revenue">Revenue</option>
                  <option value="Customer Success">Customer Success</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">Goal Title (Locked for employees)</label>
              <input type="text" required placeholder="e.g. Increase Q2 Sales by 15%" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full text-sm p-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">Description</label>
              <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full text-sm p-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Target Value</label>
                <input type="number" required value={formData.target_value} onChange={e => setFormData({...formData, target_value: e.target.value})} className="w-full text-sm p-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Target Date</label>
                <input type="date" value={formData.target_date} onChange={e => setFormData({...formData, target_date: e.target.value})} className="w-full text-sm p-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] outline-none" />
              </div>
            </div>
            
            <div className="p-3 bg-[var(--color-accent-soft)] rounded-lg flex gap-2">
               <AlertCircle className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
               <p className="text-xs text-[var(--color-accent)]">Employees will be required to assign their own weightage (1-100%) to this goal, but the title and target will remain locked.</p>
            </div>
          </form>

          {/* Right Column: Employee Selection */}
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2 mb-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Users className="w-4 h-4" /> 
                Select Employees ({formData.employee_ids.length})
              </h4>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="text-[10px] font-medium text-[var(--color-accent)] hover:underline">Select All</button>
                <button type="button" onClick={clearAll} className="text-[10px] font-medium text-[var(--color-text-muted)] hover:underline">Clear</button>
              </div>
            </div>

            {usersLoading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-[var(--color-text-muted)]">Loading employees...</div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1 pr-2 max-h-[300px] border border-[var(--color-border)] rounded-lg p-2 bg-[var(--color-bg-elevated)]">
                {eligibleEmployees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-3 p-2 rounded hover:bg-[var(--color-bg-primary)] cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={formData.employee_ids.includes(emp.id)}
                      onChange={() => handleToggleEmployee(emp.id)}
                      className="rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{emp.full_name}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] truncate">{emp.department || 'No Dept'} • {emp.email}</p>
                    </div>
                  </label>
                ))}
                {eligibleEmployees.length === 0 && (
                  <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">No active employees found.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex items-center justify-between">
          <div className="flex-1">
            {errorMsg && <p className="text-xs font-medium text-[var(--color-error)]">{errorMsg}</p>}
            {successMsg && <p className="text-xs font-medium text-[var(--color-success)] flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {successMsg}</p>}
          </div>
          <div className="flex gap-3 shrink-0">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="push-goal-form" disabled={pushGoalMutation.isPending}>
              {pushGoalMutation.isPending ? 'Pushing...' : 'Push to Selected Employees'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}