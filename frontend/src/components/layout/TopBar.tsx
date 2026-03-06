import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Building2, Check, User } from 'lucide-react'
import { getActiveTenantId, setActiveTenantId, getTenants, getTenant } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import type { Tenant } from '../../types/api'

interface TopBarProps {
  title: string
  subtitle?: string
}

const ROLE_AVATAR_BG: Record<string, string> = {
  SuperAdmin:  'bg-red-600',
  TenantOwner: 'bg-purple-600',
  Manager:     'bg-blue-600',
  Broker:      'bg-emerald-600',
  Viewer:      'bg-slate-500',
}

const ROLE_BADGE_CLS: Record<string, string> = {
  SuperAdmin:  'bg-red-50 text-red-700 ring-red-200',
  TenantOwner: 'bg-purple-50 text-purple-700 ring-purple-200',
  Manager:     'bg-blue-50 text-blue-700 ring-blue-200',
  Broker:      'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Viewer:      'bg-slate-100 text-slate-600 ring-slate-200',
}

const ROLE_LABEL: Record<string, string> = {
  SuperAdmin:  'Super Admin',
  TenantOwner: 'Proprietário',
  Manager:     'Gerente',
  Broker:      'Corretor',
  Viewer:      'Observador',
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()

  const [tenants, setTenants] = useState<Tenant[]>([])
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null)
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const tenantRef = useRef<HTMLDivElement>(null)
  const userRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    if (hasRole('SuperAdmin')) {
      getTenants()
        .then((list) => {
          setTenants(list)
          const activeId = getActiveTenantId()
          const found = list.find((t) => t.id === activeId) ?? list[0] ?? null
          if (found) {
            setActiveTenantId(found.id)
            setActiveTenant(found)
          }
        })
        .catch(() => {})
    } else if (user.tenantId) {
      getTenant(user.tenantId)
        .then((t) => setActiveTenant(t))
        .catch(() => {})
    }
  }, [user, hasRole])

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
    setActiveTenant(t)
    setTenantMenuOpen(false)
    // Navigate to Dashboard so SuperAdmin sees the selected tenant's data.
    // Use location.href (not reload) to ensure route guards re-evaluate.
    window.location.href = '/'
  }

  async function handleLogout() {
    setUserMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  const initials  = user?.email ? user.email.slice(0, 2).toUpperCase() : '?'
  const avatarBg  = ROLE_AVATAR_BG[user?.role ?? ''] ?? 'bg-slate-500'
  const badgeCls  = ROLE_BADGE_CLS[user?.role ?? ''] ?? 'bg-slate-100 text-slate-600 ring-slate-200'
  const roleLabel = ROLE_LABEL[user?.role ?? '']     ?? user?.role ?? ''

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-6 relative">
      {/* Accent gradient line at top */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-brand-500 via-accent-400 to-brand-500" />

      {/* Left: page title */}
      <div className="min-w-0">
        <h1 className="text-base font-semibold leading-tight text-slate-900 truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs leading-tight text-slate-400 truncate">{subtitle}</p>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2 ml-4 shrink-0">

        {/* Tenant: SuperAdmin gets a dropdown switcher */}
        {hasRole('SuperAdmin') ? (
          <div className="relative" ref={tenantRef}>
            <button
              onClick={() => setTenantMenuOpen((v) => !v)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                tenantMenuOpen
                  ? 'border-brand-300 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <div className="text-left">
                <p className="text-xs font-semibold leading-none">
                  {activeTenant?.name ?? 'Selecionar…'}
                </p>
                {activeTenant && (
                  <p className="mt-0.5 font-mono text-[10px] leading-none text-slate-400">
                    /{activeTenant.slug}
                  </p>
                )}
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${tenantMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {tenantMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-elevated ring-1 ring-black/5 overflow-hidden animate-scaleIn">
                <div className="border-b border-slate-100 px-4 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Corretoras disponíveis
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {tenants.map((t) => {
                    const isSelected = t.id === activeTenant?.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleTenantSelect(t)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 transition-colors ${
                          isSelected ? 'bg-brand-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isSelected ? 'bg-brand-600' : 'bg-slate-100'
                        }`}>
                          <Building2 className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-brand-700' : 'text-slate-700'}`}>
                              {t.name}
                            </p>
                            <span
                              title={t.isActive ? 'Ativa' : 'Inativa'}
                              className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                                t.isActive ? 'bg-emerald-400' : 'bg-red-400'
                              }`}
                            />
                          </div>
                          <p className="font-mono text-[11px] text-slate-400">/{t.slug}</p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-brand-600 shrink-0" />}
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

        ) : activeTenant ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <div>
              <p className="text-xs font-semibold leading-none text-slate-700">{activeTenant.name}</p>
              <p className="mt-0.5 font-mono text-[10px] leading-none text-slate-400">/{activeTenant.slug}</p>
            </div>
          </div>
        ) : null}

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* User menu */}
        {user && (
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
                userMenuOpen
                  ? 'border-brand-200 bg-brand-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarBg}`}>
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium leading-none text-slate-700 max-w-[130px] truncate">
                  {user.email}
                </p>
                <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ring-1 ring-inset ${badgeCls}`}>
                  {roleLabel}
                </span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-elevated ring-1 ring-black/5 overflow-hidden animate-scaleIn">
                <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-50 border-b border-slate-100">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${avatarBg}`}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{user.email}</p>
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ring-1 ring-inset ${badgeCls}`}>
                      {roleLabel}
                    </span>
                  </div>
                </div>

                {activeTenant && (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-100">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{activeTenant.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">/{activeTenant.slug}</p>
                    </div>
                  </div>
                )}

                <div className="p-1.5">
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/profile') }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                  >
                    <User className="h-4 w-4 shrink-0" />
                    <span className="font-medium">Meu perfil</span>
                  </button>
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
