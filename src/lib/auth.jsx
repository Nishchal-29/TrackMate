/**
 * lib/auth.jsx — Dual auth: MSAL (Azure AD) + Local JWT (email/password).
 * Provides useAuth() hook that works with both authentication methods.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'

const LocalAuthContext = createContext(null)

export function LocalAuthProvider({ children }) {
  const [localUser, setLocalUser] = useState(null)

  useEffect(() => {
    // Check for stored local JWT on mount
    const token = localStorage.getItem('local_token')
    const userData = localStorage.getItem('local_user')
    if (token && userData) {
      try {
        setLocalUser(JSON.parse(userData))
      } catch {
        localStorage.removeItem('local_token')
        localStorage.removeItem('local_user')
      }
    }
  }, [])

  const localLogin = useCallback((token, user) => {
    localStorage.setItem('local_token', token)
    localStorage.setItem('local_user', JSON.stringify(user))
    setLocalUser(user)
  }, [])

  const localLogout = useCallback(() => {
    localStorage.removeItem('local_token')
    localStorage.removeItem('local_user')
    setLocalUser(null)
  }, [])

  return (
    <LocalAuthContext.Provider value={{ localUser, localLogin, localLogout }}>
      {children}
    </LocalAuthContext.Provider>
  )
}

export function useLocalAuth() {
  const ctx = useContext(LocalAuthContext)
  if (!ctx) throw new Error('useLocalAuth must be used within LocalAuthProvider')
  return ctx
}

/**
 * Unified auth hook — checks both MSAL and local auth.
 * MSAL takes priority if both are present.
 */
export function useAuth() {
  const { accounts } = useMsal()
  const isMsalAuth = useIsAuthenticated()
  const { localUser } = useLocalAuth()

  // MSAL user (Azure AD)
  if (isMsalAuth && accounts[0]) {
    const acct = accounts[0]
    const role = acct.idTokenClaims?.roles?.[0]?.toLowerCase() || 'employee'
    return {
      user: { name: acct.name || 'User', email: acct.username || '', role },
      isAuthenticated: true,
      authMethod: 'msal',
      loading: false,
    }
  }

  // Local JWT user
  if (localUser) {
    return {
      user: localUser,
      isAuthenticated: true,
      authMethod: 'local',
      loading: false,
    }
  }

  return { user: null, isAuthenticated: false, authMethod: null, loading: false }
}
