import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Target, TrendingUp, Users, Settings,
  Shield, ClipboardList, BarChart3, LogOut, LogIn
} from 'lucide-react'
import { useMsal, useIsAuthenticated } from "@azure/msal-react"
import { loginRequest } from "@/lib/msalConfig"
import { useAuth, useLocalAuth } from '@/lib/auth'

const NAV_ITEMS = {
  employee: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/goals', icon: Target, label: 'My Goals' },
    { to: '/achievements', icon: TrendingUp, label: 'Achievements' },
  ],
  manager: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/goals', icon: Target, label: 'My Goals' },
    { to: '/team', icon: Users, label: 'My Team' },
    { to: '/achievements', icon: TrendingUp, label: 'Achievements' },
  ],
  admin: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/goals', icon: Target, label: 'My Goals' },
    { to: '/team', icon: Users, label: 'Team View' },
    { to: '/admin/users', icon: Shield, label: 'User Management' },
    { to: '/admin/cycles', icon: Settings, label: 'Quarterly Cycles' },
    { to: '/admin/audit', icon: ClipboardList, label: 'Audit Logs' },
  ],
}

function SidebarLink({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]'
      )}
    >
      <Icon className="w-4.5 h-4.5 shrink-0" />
      <span>{label}</span>
    </NavLink>
  )
}

function AuthButton() {
  const { instance } = useMsal()
  const { isAuthenticated, authMethod } = useAuth()
  const { localLogout } = useLocalAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    if (authMethod === 'msal') {
      instance.logoutPopup().catch(e => console.error(e))
    } else {
      localLogout()
      navigate('/login')
    }
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => navigate('/login')}
        className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
      >
        <LogIn className="w-3.5 h-3.5" />
        Sign In
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] text-xs font-medium hover:bg-rose-500 hover:text-white transition-colors"
    >
      <LogOut className="w-3.5 h-3.5" />
      Sign Out
    </button>
  )
}

export default function AppLayout() {
  const { user, isAuthenticated, authMethod } = useAuth()

  const userName = user?.name || 'Guest'
  const userEmail = user?.email || ''
  const userRole = user?.role || 'employee'
  const items = NAV_ITEMS[userRole] || NAV_ITEMS.employee

  const roleColors = { employee: 'bg-blue-500', manager: 'bg-amber-500', admin: 'bg-rose-500' }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        {/* Logo */}
        <div className="p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold gradient-text">TrackMate</h1>
              <p className="text-[10px] text-[var(--color-text-muted)]">Goal Management</p>
            </div>
          </div>
        </div>

        {/* Navigation - Only show if authenticated */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {isAuthenticated && items.map(item => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center text-xs font-bold text-[var(--color-accent)]">
              {userName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{userName}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] truncate">{userEmail}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <>
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  roleColors[userRole] || 'bg-blue-500'
                )} />
                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[var(--color-bg-elevated)] border border-[var(--color-border)] uppercase tracking-wider text-[var(--color-text-secondary)]">
                  {userRole}
                </span>
                {authMethod === 'local' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-info-soft)] text-[var(--color-info)]">
                    Local Auth
                  </span>
                )}
                {authMethod === 'msal' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-success-soft)] text-[var(--color-success)]">
                    Microsoft SSO
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <AuthButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[var(--color-bg-primary)] relative">
          {isAuthenticated ? (
            <Outlet />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-[var(--color-accent)]" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to TrackMate</h2>
              <p className="text-[var(--color-text-secondary)] text-sm max-w-md">
                Please sign in to access your goal sheets and team dashboard.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}