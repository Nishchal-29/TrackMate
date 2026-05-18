import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMySheets } from '@/lib/queries'
import { useMsal } from '@azure/msal-react'
import api, { achievementApi } from '@/lib/api' // Added achievementApi import
import { Card, EmptyState, Skeleton, StatusBadge, Button } from '@/components/ui'
import { TrendingUp, Target, ArrowRight, Download, Plus, X } from 'lucide-react'

export default function Achievements() {
  const navigate = useNavigate()
  // Assuming useMySheets uses SWR or React Query, 'mutate' lets us refresh the data!
  const { data: sheets, isLoading, mutate } = useMySheets()
  const [isExporting, setIsExporting] = useState(false)

  // --- Modal & Form State ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [formData, setFormData] = useState({
    quarter: 'Q1',
    financial_year: 'FY2025-26',
    actual_value: '',
    notes: ''
  })

  // Microsoft Entra ID Role Check
  const { accounts } = useMsal()
  const activeAccount = accounts[0]
  const userRole = activeAccount?.idTokenClaims?.roles?.[0]?.toLowerCase() || 'employee'

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await api.get('/export/achievements', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'Achievement_Report.csv')
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to export achievements report. Please try again.')
      console.error(err)
    } finally {
      setIsExporting(false)
    }
  }

  // --- Form Handlers ---
  const openModal = (goal) => {
    setSelectedGoal(goal)
    setErrorMsg('')
    setFormData({ ...formData, actual_value: '', notes: '' }) // Reset inputs
    setIsModalOpen(true)
  }

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg('')

    try {
      // Call the API endpoint we tested in Swagger
      await achievementApi.submitAchievement(selectedGoal.id, {
        ...formData,
        actual_value: formData.actual_value ? Number(formData.actual_value) : null,
        actual_date: null // Assuming numeric goal for now; add date picker if timeline
      })
      
      setIsModalOpen(false)
      if (mutate) mutate() // Refresh the page data instantly
    } catch (err) {
      console.error("Submission failed", err)
      // Display the specific backend error (e.g., "Tracking window closed")
      setErrorMsg(err.response?.data?.detail?.detail || err.response?.data?.detail || "Failed to log progress. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>
  }

  const approvedSheets = sheets?.filter(s => s.status === 'approved') || []

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Track your quarterly performance</p>
        </div>
        
        <Button size="sm" onClick={handleExport} disabled={isExporting}>
          <Download className="w-3.5 h-3.5" />
          {isExporting ? 'Exporting...' : 'Export Report'}
        </Button>
      </div>

      {approvedSheets.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No Approved Sheets"
          description="Achievements can only be submitted for approved goal sheets. Submit your goal sheet for approval first."
        />
      ) : (
        <div className="space-y-4">
          {approvedSheets.map(sheet => (
            <Card key={sheet.id} className="animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">{sheet.financial_year}</h2>
                  <StatusBadge status={sheet.status} />
                </div>
              </div>
              <div className="space-y-2">
                {sheet.goals.map((goal, i) => {
                  // Get the latest achievement score if it exists
                  const latestScore = goal.achievements?.length > 0 
                    ? goal.achievements[goal.achievements.length - 1].score 
                    : null;

                  return (
                    <div key={goal.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-[var(--color-bg-primary)] group hover:bg-[var(--color-bg-elevated)] transition-colors gap-3">
                      
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center text-[10px] font-bold text-[var(--color-accent)] shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{goal.title}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">
                            {goal.thrust_area} • {goal.uom_type} • {Number(goal.weightage).toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Target: {goal.target_value ? Number(goal.target_value).toLocaleString() : 'N/A'}
                          </p>
                          {/* Always show a score label, fallback to '—' if no achievements */}
                          <p className="text-xs font-bold mt-0.5">
                            {latestScore !== null ? (
                              <span className="text-[var(--color-success)]">Score: {Number(latestScore).toFixed(1)}</span>
                            ) : (
                              <span className="text-[var(--color-text-muted)]">Score: —</span>
                            )}
                          </p>
                        </div>
                        
                        <Button size="sm" variant="outline" onClick={() => openModal(goal)}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Log
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* --- LOG PROGRESS MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <h3 className="font-semibold text-lg">Log Progress</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="bg-[var(--color-bg-elevated)] p-3 rounded-lg text-sm mb-4">
                <span className="font-medium">Goal:</span> {selectedGoal?.title}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Quarter</label>
                  <select 
                    name="quarter" 
                    value={formData.quarter} 
                    onChange={handleFormChange}
                    className="w-full text-sm p-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                  >
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                    <option value="H1">H1</option>
                    <option value="H2">H2</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Financial Year</label>
                  <input 
                    type="text" 
                    name="financial_year" 
                    value={formData.financial_year} 
                    onChange={handleFormChange}
                    className="w-full text-sm p-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                  Actual Value Achieved
                </label>
                <input 
                  type="number" 
                  name="actual_value" 
                  value={formData.actual_value} 
                  onChange={handleFormChange}
                  placeholder={`Target was ${selectedGoal?.target_value}`}
                  className="w-full text-sm p-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Notes (Optional)</label>
                <textarea 
                  name="notes" 
                  value={formData.notes} 
                  onChange={handleFormChange}
                  placeholder="Provide any context for this score..."
                  className="w-full text-sm p-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] focus:outline-none focus:border-[var(--color-accent)] min-h-[80px]"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded bg-[var(--color-error-soft)] text-[var(--color-error)] text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Progress'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}