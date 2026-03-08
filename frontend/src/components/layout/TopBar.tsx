import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Building2, User, Menu } from 'lucide-react'
import { getTenant } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { useMobileMenu } from '../../contexts/MobileMenuContext'
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
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const mobileMenu = useMobileMenu()

  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const userRef = useRef<HTMLDivElement>(null)

  const isSuperAdmin = user?.role === 'SuperAdmin'

  useEffect(() => {
    if (!user) return
    if (!isSuperAdmin && user.tenantId) {
      getTenant(user.tenantId)
        .then((t) => setActiveTenant(t))
        .catch(() => {})
    }
  }, [user, isSuperAdmin])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

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
    <header className="sticky top-0 z-30 flex h-14 lg:h-16 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-3 sm:px-4 lg:px-6 relative">
      {/* Accent gradient line at top */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-brand-500 via-accent-400 to-brand-500" />

      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={() => mobileMenu?.openMobileMenu()}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm lg:text-base font-semibold leading-tight text-slate-900 truncate">{title}</h1>
          {subtitle && (
            <p className="text-[11px] lg:text-xs leading-tight text-slate-400 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 ml-2 shrink-0">

        {/* Tenant info (hidden for SuperAdmin) */}
        {!isSuperAdmin && activeTenant ? (
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <div>
              <p className="text-xs font-semibold leading-none text-slate-700">{activeTenant.name}</p>
              <p className="mt-0.5 font-mono text-[10px] leading-none text-slate-400">/{activeTenant.slug}</p>
            </div>
          </div>
        ) : null}

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* User menu */}
        {user && (
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`flex items-center gap-1.5 sm:gap-2 rounded-lg border px-2 sm:px-2.5 py-1.5 transition-colors ${
                userMenuOpen
                  ? 'border-brand-200 bg-brand-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarBg}`}>
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-medium leading-none text-slate-700 max-w-[130px] truncate">
                  {user.email}
                </p>
                <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ring-1 ring-inset ${badgeCls}`}>
                  {roleLabel}
                </span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform hidden sm:block ${userMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-64 rounded-xl border border-slate-200 bg-white shadow-elevated ring-1 ring-black/5 overflow-hidden animate-scaleIn">
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

                {!isSuperAdmin && activeTenant && (
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
