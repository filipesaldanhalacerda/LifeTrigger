import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

type UserRole = 'SuperAdmin' | 'TenantAdmin' | 'Partner' | 'ReadOnly'

interface ProtectedRouteProps {
  minRole?: UserRole
}

/**
 * Layout route that guards children behind authentication (and optionally a minimum role).
 * - While loading: shows a full-screen spinner
 * - Not authenticated: redirects to /login
 * - Authenticated but insufficient role: redirects to /
 * - OK: renders <Outlet />
 */
export function ProtectedRoute({ minRole }: ProtectedRouteProps) {
  const { user, loading, hasRole } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (minRole && !hasRole(minRole)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
