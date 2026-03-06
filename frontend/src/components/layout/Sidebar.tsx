import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FilePlus,
  History,
  Zap,
  Settings,
  Shield,
  Cpu,
  Activity,
  Users,
  BarChart2,
  Building2,
  UserCheck,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  BookOpen,
  Eye,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../contexts/AuthContext'
import { useEffect } from 'react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

interface NavItemDef {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
  minRole?: UserRole
  tenantOnly?: boolean
}

interface NavSection {
  label: string
  items: NavItemDef[]
}

const sections: NavSection[] = [
  {
    label: 'Visão Geral',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, tenantOnly: true },
    ],
  },
  {
    label: 'Operações',
    items: [
      { to: '/evaluations/new', label: 'Nova Avaliação',  icon: FilePlus, minRole: 'Broker', tenantOnly: true },
      { to: '/triggers/new',    label: 'Gatilhos de Vida', icon: Zap,      minRole: 'Broker', tenantOnly: true },
      { to: '/evaluations',     label: 'Histórico',        icon: History,  end: true, tenantOnly: true },
      { to: '/clients',         label: 'Meus Clientes',    icon: UserCheck, minRole: 'Broker', tenantOnly: true },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { to: '/team',    label: 'Equipe',     icon: Users,    minRole: 'Manager', tenantOnly: true },
      { to: '/reports', label: 'Relatórios',  icon: BarChart2, minRole: 'Manager', tenantOnly: true },
      { to: '/audit',   label: 'Auditoria',   icon: Shield,   minRole: 'Manager', tenantOnly: true },
      { to: '/engine',  label: 'Motor',        icon: Cpu,      minRole: 'Manager', tenantOnly: true },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { to: '/settings', label: 'Tenant',             icon: Settings,   minRole: 'TenantOwner', tenantOnly: true },
      { to: '/billing',  label: 'Plano & Faturamento', icon: CreditCard, minRole: 'TenantOwner', tenantOnly: true },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      { to: '/admin/tenants',  label: 'Corretoras',         icon: Building2, minRole: 'SuperAdmin' },
      { to: '/admin/users',    label: 'Usuários Globais',   icon: Users,     minRole: 'SuperAdmin' },
      { to: '/admin/access',   label: 'Monitor de Acessos', icon: Eye,       minRole: 'SuperAdmin' },
    ],
  },
  {
    label: 'Suporte',
    items: [
      { to: '/guide', label: 'Guia do Sistema', icon: BookOpen },
    ],
  },
]

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, hasRole } = useAuth()
  const location = useLocation()
  const isSuperAdmin = user?.role === 'SuperAdmin'

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose()
  }, [location.pathname, onMobileClose])

  function visible(item: NavItemDef) {
    // SuperAdmin sees only platform-level items (no tenant operations)
    if (isSuperAdmin) return item.minRole === 'SuperAdmin' || !item.minRole
    if (item.tenantOnly) return true
    return !item.minRole || hasRole(item.minRole)
  }

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter(visible),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-brand-900/30 transition-all duration-300 ease-in-out',
        // Mobile: full-width drawer, slide in/out
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'w-72 lg:translate-x-0',
        // Desktop: respect collapsed state
        collapsed ? 'lg:w-20' : 'lg:w-64',
      )}
      style={{ background: 'linear-gradient(180deg, #0B1F3A 0%, #132D54 100%)' }}
    >
      {/* Logo */}
      <div className={cn(
        'flex h-16 items-center gap-3 border-b border-brand-800/30 px-5',
        collapsed && 'lg:justify-center lg:px-0',
      )}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-900/40">
          <Activity className="h-4.5 w-4.5 text-white" />
        </div>
        <div className={cn('overflow-hidden', collapsed && 'lg:hidden')}>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold leading-none text-white">LifeTrigger</p>
            <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[8px] font-bold text-amber-300 uppercase tracking-wider ring-1 ring-amber-400/30">Demo</span>
          </div>
          <p className="mt-0.5 text-[11px] leading-none text-brand-300/70">Engine v1.0.0</p>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="ml-auto rounded-lg p-1.5 text-brand-300 hover:bg-brand-700/30 hover:text-white transition-colors lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="scrollbar-dark flex-1 overflow-y-auto px-3 py-4">
        {visibleSections.map((section, idx) => (
          <div key={section.label} className={cn(idx > 0 && 'mt-5')}>
            {!(collapsed) ? (
              <p className={cn(
                'mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-brand-300/50',
                collapsed && 'lg:hidden',
              )}>
                {section.label}
              </p>
            ) : (
              <>
                {/* Mobile: always show label */}
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-brand-300/50 lg:hidden">
                  {section.label}
                </p>
                {/* Desktop collapsed: divider */}
                {idx > 0 && (
                  <div className="mx-auto mb-3 h-px w-8 bg-brand-700/50 hidden lg:block" />
                )}
              </>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.to} {...item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Toggle + Footer */}
      <div className="border-t border-brand-800/30 px-3 py-3">
        {/* Desktop toggle (hidden on mobile) */}
        <button
          onClick={onToggle}
          className="hidden lg:flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-brand-300 hover:bg-brand-700/30 hover:text-white transition-colors"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium">Recolher</span>
            </>
          )}
        </button>
        <div className={cn('mt-2 px-2', collapsed && 'lg:hidden')}>
          <p className="text-[11px] text-brand-300/40">Motor de Inteligência de</p>
          <p className="text-[11px] text-brand-300/40">Proteção de Vida · B2B SaaS</p>
        </div>
      </div>
    </aside>
  )
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  collapsed,
}: {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
  collapsed: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          collapsed && 'lg:justify-center lg:px-0',
          isActive
            ? 'bg-brand-500/20 text-white'
            : 'text-brand-200/60 hover:bg-brand-700/30 hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-brand-400" />
          )}
          <Icon className="h-4 w-4 shrink-0" />
          {/* Always show label on mobile, hide on desktop when collapsed */}
          <span className={cn(collapsed && 'lg:hidden')}>{label}</span>
          {/* Tooltip in collapsed mode (desktop only) */}
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 hidden lg:block">
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
