import { useDashboard } from '@/lib/queries'
import { useAuth } from '@/lib/auth'
import { useMsal } from "@azure/msal-react"
import { Card, Skeleton } from '@/components/ui'
import { Users, FileText, CheckCircle, TrendingUp, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

function StatCard({ icon: Icon, label, value, color, suffix }) {
  return (
    <Card className="hover:border-[var(--color-border)] transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center`}
          style={{ background: `var(--color-${color}-soft)` }}>
          <Icon className="w-5 h-5" style={{ color: `var(--color-${color})` }} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}{suffix}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
        </div>
      </div>
    </Card>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="mt-0.5">{p.name}: {Number(p.value).toFixed(1)}</p>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth() // Fetches local auth
  const { accounts } = useMsal() // Fetches Azure AD auth  
  const msalRole = accounts[0]?.idTokenClaims?.roles?.[0]?.toLowerCase()
  const isAdmin = msalRole === 'admin' || user?.role === 'admin'
  const { data: stats, isLoading } = useDashboard('FY2025-26')

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Card>
          <p className="text-sm text-[var(--color-text-secondary)]">Admin dashboard is only available for admin users. Switch your role to admin using the role switcher above.</p>
        </Card>
      </div>
    )
  }

  const deptData = stats?.department_scores?.map(d => ({
    name: d.department || 'Unknown',
    score: Number(d.avg_score || 0),
    employees: d.employee_count,
  })) || []

  const trendData = stats?.quarter_trends?.map(t => ({
    name: `${t.quarter} ${t.financial_year}`,
    score: Number(t.avg_score || 0),
  })) || []

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Organization-wide performance overview — FY2025-26</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Employees" value={stats?.total_employees || 0} color="accent" />
        <StatCard icon={FileText} label="Total Sheets" value={stats?.total_sheets || 0} color="info" />
        <StatCard icon={CheckCircle} label="Approved" value={Number(stats?.sheets_approved_pct || 0).toFixed(0)} suffix="%" color="success" />
        <StatCard icon={TrendingUp} label="Avg Score" value={stats?.avg_org_score ? Number(stats.avg_org_score).toFixed(1) : '—'} color="warning" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Scores */}
        <Card>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--color-accent)]" />
            Department Scores
          </h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-sm text-[var(--color-text-muted)]">
              No department data yet
            </div>
          )}
        </Card>

        {/* Quarter Trends */}
        <Card>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />
            Quarter Trends
          </h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="score" stroke="var(--color-success)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-sm text-[var(--color-text-muted)]">
              No trend data yet — achievements need to be submitted
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
