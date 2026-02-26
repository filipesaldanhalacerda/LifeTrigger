import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, RefreshCw, Circle, LogOut } from 'lucide-react'
import { getActiveTenantId, setActiveTenantId, getTenants, getTenant } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import type { Tenant } from '../../types/api'

interface TopBarProps {
  title: string
  subtitle?: string
  onRefresh?: () => void
  isLoading?: boolean
}

const ROLE_BADGE: Record<string, string> = {
  SuperAdmin:  'bg-indigo-100 text-indigo-700',
  TenantAdmin: 'bg-violet-100 text-violet-700',
  Partner:     'bg-emerald-100 text-emerald-700',
  ReadOnly:    'bg-slate-100 text-slate-600',
}

const ROLE_LABEL: Record<string, string> = {
  SuperAdmin:  'Super Admin',
  TenantAdmin: 'Admin',
  Partner:     'Partner',
  ReadOnly:    'Leitura',
}

export function TopBar({ title, subtitle, onRefresh, isLoading }: TopBarProps) {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false)
  const [tenants, setTenants]               = useState<Tenant[]>([])
  const [activeTenantName, setActiveTenantName] = useState<string>('')

  useEffect(() => {
    if (!user) return
    if (hasRole('SuperAdmin')) {
      getTenants()
        .then((list) => {
          setTenants(list)
          const activeId = getActiveTenantId()
          const found = list.find((t) => t.id === activeId)
          if (found) setActiveTenantName(found.name)
          else if (list.length > 0) {
            setActiveTenantId(list[0].id)
            setActiveTenantName(list[0].name)
          }
        })
        .catch(() => {})
    } else if (user.tenantId) {
      getTenant(user.tenantId)
        .then((t) => setActiveTenantName(t.name))
        .catch(() => setActiveTenantName(user.tenantId ?? ''))
    }
  }, [user, hasRole])

  function handleTenantSelect(t: Tenant) {
    setActiveTenantId(t.id)
    setActiveTenantName(t.name)
    setTenantMenuOpen(false)
    window.location.reload()
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Tenant selector — SuperAdmin can switch; others see their own tenant */}
        {hasRole('SuperAdmin') ? (
          <div className="relative">
            <button
              onClick={() => setTenantMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
              <span className="max-w-[180px] truncate">{activeTenantName || 'Selecionar tenant…'}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {tenantMenuOpen && (
              <div className="absolute right-0 mt-1 w-64 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {tenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTenantSelect(t)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Circle
                      className={`h-2 w-2 ${t.id === getActiveTenantId() ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300'}`}
                    />
                    <div className="text-left">
                      <p className="font-medium">{t.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{t.id.slice(0, 8)}…</p>
                    </div>
                  </button>
                ))}
                {tenants.length === 0 && (
                  <p className="px-4 py-2.5 text-sm text-slate-400">Nenhum tenant encontrado.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
            <span className="max-w-[160px] truncate">{activeTenantName || user?.tenantId?.slice(0, 8) || '—'}</span>
          </div>
        )}

        {/* Refresh */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        )}

        {/* User info + logout */}
        {user && (
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <div className="text-right">
              <p className="text-xs font-medium text-slate-800 leading-none">{user.email}</p>
              <span
                className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${ROLE_BADGE[user.role] ?? 'bg-slate-100 text-slate-600'}`}
              >
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
