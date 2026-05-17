import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { loginRequest } from '@/lib/msalConfig'
import { useLocalAuth } from '@/lib/auth'
import axios from 'axios'
import { BarChart3, Mail, Lock, LogIn, ArrowRight, User, Building, UserCheck } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

const TEST_ACCOUNTS = [
  { email: 'employee@trackmate.com', password: 'employee123', role: 'Employee', color: 'bg-blue-500' },
  { email: 'manager@trackmate.com', password: 'manager123', role: 'Manager', color: 'bg-amber-500' },
  { email: 'admin@trackmate.com', password: 'admin123', role: 'Admin', color: 'bg-rose-500' },
]

export default function LoginPage() {
  const { instance } = useMsal()
  const { localLogin } = useLocalAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('select') // select | login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('employee')
  const [department, setDepartment] = useState('')
  const [managerEmail, setManagerEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleMicrosoftLogin = () => {
    instance.loginRedirect(loginRequest).catch(e => console.error(e))
  }

  const handleLocalLogin = async (e) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password })
      localLogin(res.data.access_token, res.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post(`${API_URL}/auth/register`, {
        email, password, full_name: name, role,
        department: department || null,
        manager_email: managerEmail || null,
      })
      localLogin(res.data.access_token, res.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = (acct) => {
    setEmail(acct.email)
    setPassword(acct.password)
    setMode('login')
    // Auto-submit
    setTimeout(async () => {
      setLoading(true)
      try {
        const res = await axios.post(`${API_URL}/auth/login`, { email: acct.email, password: acct.password })
        localLogin(res.data.access_token, res.data.user)
        navigate('/')
      } catch (err) {
        setError(err.response?.data?.detail || 'Login failed')
      } finally {
        setLoading(false)
      }
    }, 100)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-[var(--color-bg-primary)]">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">TrackMate</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Goal Setting & Tracking Portal</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-6 shadow-2xl">
          {mode === 'select' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-semibold text-center mb-5">Sign In</h2>

              {/* Microsoft SSO */}
              <button
                onClick={handleMicrosoftLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white text-sm font-medium transition-all duration-200 border border-[var(--color-border)]"
              >
                <svg className="w-5 h-5" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                Sign in with Microsoft
              </button>

              <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                <div className="flex-1 h-px bg-[var(--color-border)]" />
                <span>or use email</span>
                <div className="flex-1 h-px bg-[var(--color-border)]" />
              </div>

              {/* Email/Password */}
              <button
                onClick={() => setMode('login')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border)] text-sm font-medium transition-all duration-200"
              >
                <Mail className="w-4 h-4" />
                Sign in with Email & Password
              </button>

              <button
                onClick={() => setMode('register')}
                className="w-full text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors py-1"
              >
                Don't have an account? <span className="font-medium underline">Register</span>
              </button>

              {/* Quick login cards
              <div className="pt-3 border-t border-[var(--color-border)]">
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-2 text-center">Quick Demo Login</p>
                <div className="grid grid-cols-3 gap-2">
                  {TEST_ACCOUNTS.map(acct => (
                    <button
                      key={acct.role}
                      onClick={() => handleQuickLogin(acct)}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border)] transition-all duration-200 group"
                    >
                      <span className={`w-6 h-6 rounded-full ${acct.color} flex items-center justify-center`}>
                        <User className="w-3 h-3 text-white" />
                      </span>
                      <span className="text-[10px] font-medium group-hover:text-[var(--color-accent)] transition-colors">{acct.role}</span>
                    </button>
                  ))}
                </div>
              </div> */}
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLocalLogin} className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => { setMode('select'); setError('') }}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-xs">
                  ← Back
                </button>
                <h2 className="text-lg font-semibold flex-1">Email Login</h2>
              </div>

              {error && (
                <div className="px-3 py-2 rounded-lg bg-[var(--color-danger-soft)] text-[var(--color-danger)] text-xs">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? <span className="animate-spin">⟳</span> : <LogIn className="w-4 h-4" />}
                Sign In
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => { setMode('select'); setError('') }}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-xs">
                  ← Back
                </button>
                <h2 className="text-lg font-semibold flex-1">Create Account</h2>
              </div>

              {error && (
                <div className="px-3 py-2 rounded-lg bg-[var(--color-danger-soft)] text-[var(--color-danger)] text-xs">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Full Name</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="you@company.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">Password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Role</label>
                  <select
                    value={role} onChange={e => setRole(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">Department</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                    <input
                      type="text" value={department} onChange={e => setDepartment(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      placeholder="e.g. Engineering"
                    />
                  </div>
                </div>
              </div>

              {(role === 'employee' || role === 'manager') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Reporting Manager Email
                    <span className="text-[var(--color-text-muted)] font-normal"> (optional)</span>
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                    <input
                      type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      placeholder="manager@company.com"
                    />
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    Your manager must already be registered. This links you to their team.
                  </p>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? <span className="animate-spin">⟳</span> : <ArrowRight className="w-4 h-4" />}
                Create Account
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[10px] text-[var(--color-text-muted)] mt-6">
          TrackMate © 2026 — Enterprise Goal Management
        </p>
      </div>
    </div>
  )
}
