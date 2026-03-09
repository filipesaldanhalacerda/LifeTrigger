import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Building2, User, Menu, Search } from 'lucide-react'
import { getTenant } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { useMobileMenu } from '../../contexts/MobileMenuContext'
import { GlobalSearch } from './GlobalSearch'
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
  const [searchOpen, setSearchOpen] = useState(false)

  const userRef = useRef<HTMLDivElement>(null)

  // Ctrl+K / Cmd+K to open search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

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
  <>
    <header className="sticky top-0 z-30 bg-white" style={{ minHeight: '4.25rem', borderBottom: '1px solid #f3f3f3' }}>
      <div className="flex h-full items-center justify-between px-4 lg:px-6" style={{ minHeight: '4.25rem' }}>

        {/* Left: hamburger + page title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => mobileMenu?.openMobileMenu()}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="text-[15px] font-semibold leading-tight text-slate-800">{title}</h1>

          {/* Breadcrumb-style subtitle */}
          {subtitle && (
            <span className="hidden sm:inline text-xs text-slate-400">/ {subtitle}</span>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2 ml-2 shrink-0">

          {/* Search trigger — mobile (icon only) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex sm:hidden h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>

          {/* Search trigger — desktop */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2.5 rounded-full border border-slate-200 bg-white pl-4 pr-3 py-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 hover:border-slate-300 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Buscar páginas, avaliações…</span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400 ml-2">Ctrl+K</kbd>
          </button>

          {/* Tenant pill */}
          {!isSuperAdmin && activeTenant && (
            <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3.5 py-2">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-brand-500" />
              <span className="text-xs font-semibold text-slate-700">{activeTenant.name}</span>
            </div>
          )}

          {/* Divider */}
          <div className="h-7 w-px bg-slate-200 hidden sm:block mx-1" />

          {/* User menu */}
          {user && (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className={`flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 transition-colors ${
                  userMenuOpen
                    ? 'bg-brand-50 ring-1 ring-brand-200'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm ${avatarBg}`}>
                  {initials}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-[13px] font-semibold leading-none text-slate-800 max-w-[120px] truncate">
                    {user.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] leading-none text-slate-400 mt-0.5">{roleLabel}</p>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform hidden sm:block ${userMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-sm border border-slate-200 bg-white shadow-elevated overflow-hidden animate-scaleIn">
                  <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${avatarBg}`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{user.email}</p>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ring-1 ring-inset ${badgeCls}`}>
                        {roleLabel}
                      </span>
                    </div>
                  </div>

                  {!isSuperAdmin && activeTenant && (
                    <div className="flex items-center gap-2.5 px-5 py-3 border-b border-slate-100">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{activeTenant.name}</p>
                        <p className="font-mono text-[10px] text-slate-400">/{activeTenant.slug}</p>
                      </div>
                    </div>
                  )}

                  <div className="p-2">
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/profile') }}
                      className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <User className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="font-medium">Meu perfil</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <LogOut className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="font-medium">Sair da conta</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </header>

    {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
  </>
  )
}
