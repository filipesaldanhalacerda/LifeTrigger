import { NavLink } from 'react-router-dom'
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
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import { getActiveTenantId } from '../../lib/api'
import type { UserRole } from '../../contexts/AuthContext'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
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
      { to: '/admin/tenants',  label: 'Corretoras',       icon: Building2, minRole: 'SuperAdmin' },
      { to: '/admin/platform', label: 'Visão Global',     icon: Globe,     minRole: 'SuperAdmin' },
      { to: '/admin/users',    label: 'Usuários Globais', icon: Users,     minRole: 'SuperAdmin' },
    ],
  },
  {
    label: 'Suporte',
    items: [
      { to: '/guide', label: 'Guia do Sistema', icon: BookOpen },
    ],
  },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, hasRole } = useAuth()
  const isSuperAdmin = user?.role === 'SuperAdmin'
  const superAdminHasTenant = isSuperAdmin && !!getActiveTenantId()

  function visible(item: NavItemDef) {
    // SuperAdmin sees tenant items only when they have a tenant selected
    if (item.tenantOnly && isSuperAdmin && !superAdminHasTenant) return false
    // For SuperAdmin with tenant selected, skip minRole check on tenant items
    // (they should see everything as the highest-privilege user)
    if (item.tenantOnly && superAdminHasTenant) return true
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
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-brand-900/30 transition-all duration-300 ease-in-out',
        collapsed ? 'w-20' : 'w-64',
      )}
      style={{ background: 'linear-gradient(180deg, #0B1F3A 0%, #132D54 100%)' }}
    >
      {/* Logo */}
      <div className={cn(
        'flex h-16 items-center gap-3 border-b border-brand-800/30 px-5',
        collapsed && 'justify-center px-0',
      )}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-900/40">
          <Activity className="h-4.5 w-4.5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold leading-none text-white">LifeTrigger</p>
            <p className="mt-0.5 text-[11px] leading-none text-brand-300/70">Engine v1.0.0</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="scrollbar-dark flex-1 overflow-y-auto px-3 py-4">
        {visibleSections.map((section, idx) => (
          <div key={section.label} className={cn(idx > 0 && 'mt-5')}>
            {!collapsed ? (
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-brand-300/50">
                {section.label}
              </p>
            ) : idx > 0 ? (
              <div className="mx-auto mb-3 h-px w-8 bg-brand-700/50" />
            ) : null}
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
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-brand-300 hover:bg-brand-700/30 hover:text-white transition-colors"
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
        {!collapsed && (
          <div className="mt-2 px-2">
            <p className="text-[11px] text-brand-300/40">Motor de Inteligência de</p>
            <p className="text-[11px] text-brand-300/40">Proteção de Vida · B2B SaaS</p>
          </div>
        )}
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
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-brand-500/20 text-white'
            : 'text-brand-200/60 hover:bg-brand-700/30 hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active indicator bar */}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-brand-400" />
          )}
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{label}</span>}
          {/* Tooltip in collapsed mode */}
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
