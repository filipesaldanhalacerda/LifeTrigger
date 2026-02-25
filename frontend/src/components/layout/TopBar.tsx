import { useState } from 'react'
import { ChevronDown, RefreshCw, Circle } from 'lucide-react'
import { DEMO_TENANTS, getActiveTenantId, setActiveTenantId } from '../../lib/api'

interface TopBarProps {
  title: string
  subtitle?: string
  onRefresh?: () => void
  isLoading?: boolean
}

export function TopBar({ title, subtitle, onRefresh, isLoading }: TopBarProps) {
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false)
  const activeTenant =
    DEMO_TENANTS.find((t) => t.id === getActiveTenantId()) ?? DEMO_TENANTS[0]

  function handleTenantSelect(id: string) {
    setActiveTenantId(id)
    setTenantMenuOpen(false)
    window.location.reload()
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Tenant selector */}
        <div className="relative">
          <button
            onClick={() => setTenantMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
            <span className="max-w-[180px] truncate">{activeTenant.name}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {tenantMenuOpen && (
            <div className="absolute right-0 mt-1 w-64 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {DEMO_TENANTS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTenantSelect(t.id)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Circle
                    className={`h-2 w-2 ${t.id === activeTenant.id ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300'}`}
                  />
                  <div className="text-left">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{t.id.slice(0, 8)}…</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

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
      </div>
    </header>
  )
}
