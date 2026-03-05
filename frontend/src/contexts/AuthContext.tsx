import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import {
  getMe,
  login as apiLogin,
  logout as apiLogout,
  getToken,
  clearTokens,
  setActiveTenantId,
  type AuthUser,
} from '../lib/api'

export type UserRole = 'SuperAdmin' | 'TenantOwner' | 'Manager' | 'Broker' | 'Viewer'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SuperAdmin:  5,
  TenantOwner: 4,
  Manager:     3,
  Broker:      2,
  Viewer:      1,
}

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasRole: (minRole: UserRole) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount, restore session from existing token
  useEffect(() => {
    const restore = async () => {
      if (getToken()) {
        try {
          const me = await getMe()
          setUser(me)
          if (me.tenantId) setActiveTenantId(me.tenantId)
        } catch {
          clearTokens()
        }
      }
      setLoading(false)
    }
    void restore()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  const hasRole = useCallback(
    (minRole: UserRole): boolean => {
      if (!user) return false
      return ROLE_HIERARCHY[user.role as UserRole] >= ROLE_HIERARCHY[minRole]
    },
    [user],
  )

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
