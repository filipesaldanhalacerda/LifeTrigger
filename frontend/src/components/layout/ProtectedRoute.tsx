import { Navigate, Outlet } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../contexts/AuthContext'

interface ProtectedRouteProps {
  minRole?: UserRole
  tenantRequired?: boolean
}

export function ProtectedRoute({ minRole, tenantRequired }: ProtectedRouteProps) {
  const { user, loading, hasRole } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-brand-950">
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-brand-700/40 ring-1 ring-brand-500/30">
            <Activity className="h-7 w-7 text-brand-400 animate-pulse-brand" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-brand-300">LifeTrigger</p>
            <p className="mt-1 text-xs text-brand-500">Carregando…</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (minRole && !hasRole(minRole)) {
    return <Navigate to="/" replace />
  }

  // SuperAdmin has no tenantId — always redirect to platform admin
  if (tenantRequired && !user.tenantId) {
    return <Navigate to="/admin/tenants" replace />
  }

  return <Outlet />
}
