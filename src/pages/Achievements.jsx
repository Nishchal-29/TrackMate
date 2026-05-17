import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMySheets } from '@/lib/queries'
import { useMsal } from '@azure/msal-react'
import api from '@/lib/api'
import { Card, EmptyState, Skeleton, StatusBadge, Button } from '@/components/ui'
import { TrendingUp, Target, ArrowRight, Download } from 'lucide-react'

export default function Achievements() {
  const navigate = useNavigate()
  const { data: sheets, isLoading } = useMySheets()
  const [isExporting, setIsExporting] = useState(false)

  // Microsoft Entra ID Role Check
  const { accounts } = useMsal()
  const activeAccount = accounts[0]
  // We still fetch the role in case you need it for other UI elements later
  const userRole = activeAccount?.idTokenClaims?.roles?.[0]?.toLowerCase() || 'employee'

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // We must specify responseType 'blob' so Axios doesn't try to parse the file as JSON
      const response = await api.get('/export/achievements', { responseType: 'blob' })
      
      // Create a temporary URL to trigger the browser's download behavior
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      // Specify the default filename
      link.setAttribute('download', 'Achievement_Report.csv')
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to export achievements report. Please try again.')
      console.error(err)
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>
  }

  const approvedSheets = sheets?.filter(s => s.status === 'approved') || []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Track your quarterly performance</p>
        </div>
        
        {/* Export Button - Now visible to EVERYONE (Employees, Managers, Admins) */}
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
                {sheet.goals.map((goal, i) => (
                  <div key={goal.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-primary)] group hover:bg-[var(--color-bg-elevated)] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center text-[10px] font-bold text-[var(--color-accent)]">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{goal.title}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          {goal.thrust_area} • {goal.uom_type} • {Number(goal.weightage).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Target: {goal.target_value ? Number(goal.target_value).toLocaleString() : 'N/A'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-3 text-center">
                Achievement submission requires an active quarterly cycle configured by admin
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}