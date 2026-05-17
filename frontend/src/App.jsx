import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LocalAuthProvider, useAuth } from '@/lib/auth'
import AppLayout from '@/components/AppLayout'
import LoginPage from '@/pages/LoginPage'
import Dashboard from '@/pages/Dashboard'
import GoalEditor from '@/pages/GoalEditor'
import Achievements from '@/pages/Achievements'
import TeamDashboard from '@/pages/TeamDashboard'
import AdminDashboard from '@/pages/AdminDashboard'
import UserManagement from '@/pages/UserManagement'
import QuarterlyCycles from '@/pages/QuarterlyCycles'
import AuditLogs from '@/pages/AuditLogs'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function RoleRoute({ roles, children }) {
  const { user } = useAuth()
  if (!roles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user, isAuthenticated } = useAuth()

  // Admin sees AdminDashboard as home, others see employee Dashboard
  const HomePage = user?.role === 'admin' ? AdminDashboard : Dashboard

  return (
    <Routes>
      {/* Login page — accessible without auth */}
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
      } />

      {/* Protected app routes */}
      <Route element={<AppLayout />}>
        <Route index element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/goals" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/goals/:sheetId" element={<ProtectedRoute><GoalEditor /></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />

        {/* Manager + Admin */}
        <Route path="/team" element={
          <ProtectedRoute><RoleRoute roles={['manager', 'admin']}><TeamDashboard /></RoleRoute></ProtectedRoute>
        } />

        {/* Admin only */}
        <Route path="/admin/users" element={
          <ProtectedRoute><RoleRoute roles={['admin']}><UserManagement /></RoleRoute></ProtectedRoute>
        } />
        <Route path="/admin/cycles" element={
          <ProtectedRoute><RoleRoute roles={['admin']}><QuarterlyCycles /></RoleRoute></ProtectedRoute>
        } />
        <Route path="/admin/audit" element={
          <ProtectedRoute><RoleRoute roles={['admin']}><AuditLogs /></RoleRoute></ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocalAuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </LocalAuthProvider>
    </QueryClientProvider>
  )
}
