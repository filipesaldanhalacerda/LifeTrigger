import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, RefreshCw, LogOut, Building2, Check, User } from 'lucide-react'
import { getActiveTenantId, setActiveTenantId, getTenants, getTenant } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import type { Tenant } from '../../types/api'

interface TopBarProps {
  title: string
  subtitle?: string
  onRefresh?: () => void
  isLoading?: boolean
}

// ── Role appearance ───────────────────────────────────────────────
const ROLE_AVATAR_BG: Record<string, string> = {
  SuperAdmin:  'bg-indigo-600',
  TenantAdmin: 'bg-violet-600',
  Partner:     'bg-emerald-600',
  ReadOnly:    'bg-slate-500',
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

// ── Component ─────────────────────────────────────────────────────
export function TopBar({ title, subtitle, onRefresh, isLoading }: TopBarProps) {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()

  const [tenants, setTenants] = useState<Tenant[]>([])
  const [activeTenantName, setActiveTenantName] = useState<string>('')
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const tenantRef = useRef<HTMLDivElement>(null)
  const userRef   = useRef<HTMLDivElement>(null)

  // ── Load tenant info ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    if (hasRole('SuperAdmin')) {
      getTenants()
        .then((list) => {
          setTenants(list)
          const activeId = getActiveTenantId()
          const found = list.find((t) => t.id === activeId)
          if (found) {
            setActiveTenantName(found.name)
          } else if (list.length > 0) {
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

  // ── Close on outside click ────────────────────────────────────
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (tenantRef.current && !tenantRef.current.contains(e.target as Node)) {
        setTenantMenuOpen(false)
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function handleTenantSelect(t: Tenant) {
    setActiveTenantId(t.id)
    setActiveTenantName(t.name)
    setTenantMenuOpen(false)
    window.location.reload()
  }

  async function handleLogout() {
    setUserMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  // User avatar initials
  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?'

  const avatarBg   = ROLE_AVATAR_BG[user?.role ?? ''] ?? 'bg-slate-500'
  const badgeCls   = ROLE_BADGE[user?.role ?? '']     ?? 'bg-slate-100 text-slate-600'
  const roleLabel  = ROLE_LABEL[user?.role ?? '']     ?? user?.role ?? ''

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-6">

      {/* ── Left: page title ── */}
      <div className="min-w-0">
        <h1 className="text-base font-semibold leading-tight text-slate-900 truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs leading-tight text-slate-400 truncate">{subtitle}</p>
        )}
      </div>

      {/* ── Right: controls ── */}
      <div className="flex items-center gap-2 ml-4 shrink-0">

        {/* Refresh */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Atualizar dados"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}

        {/* ── Tenant selector ── */}
        {hasRole('SuperAdmin') ? (
          <div className="relative" ref={tenantRef}>
            <button
              onClick={() => setTenantMenuOpen((v) => !v)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                tenantMenuOpen
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[140px] truncate">
                {activeTenantName || 'Selecionar tenant…'}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${tenantMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {tenantMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Corretoras disponíveis
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {tenants.map((t) => {
                    const isActive = t.id === getActiveTenantId()
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleTenantSelect(t)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 transition-colors ${
                          isActive ? 'bg-indigo-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          isActive ? 'bg-indigo-600' : 'bg-slate-100'
                        }`}>
                          <Building2 className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className={`text-sm font-medium truncate ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                            {t.name}
                          </p>
                          <p className="font-mono text-[11px] text-slate-400">{t.id.slice(0, 8)}…</p>
                        </div>
                        {isActive && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                      </button>
                    )
                  })}
                  {tenants.length === 0 && (
                    <p className="px-4 py-3 text-sm text-slate-400 text-center">
                      Nenhuma corretora encontrada.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : activeTenantName ? (
          /* Read-only tenant chip for non-SuperAdmin */
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="max-w-[140px] truncate font-medium">{activeTenantName}</span>
          </div>
        ) : null}

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* ── User menu ── */}
        {user && (
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`flex items-center gap-2 rounded-full border px-2 py-1.5 transition-colors ${
                userMenuOpen
                  ? 'border-indigo-200 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              {/* Avatar */}
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarBg}`}>
                {initials}
              </div>
              {/* Email (hidden on small screens) */}
              <span className="hidden sm:block max-w-[140px] truncate text-xs font-medium text-slate-700">
                {user.email}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 overflow-hidden">
                {/* User info header */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${avatarBg}`}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{user.email}</p>
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${badgeCls}`}>
                      {roleLabel}
                    </span>
                  </div>
                </div>

                {/* Account info row */}
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-mono truncate">{user.id.slice(0, 12)}…</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-1.5">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span className="font-medium">Sair da conta</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </header>
  )
}
