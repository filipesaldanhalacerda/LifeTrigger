import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FilePlus,

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
  HeartPulse,
  BarChart3,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../contexts/AuthContext'
import { useEffect, useState } from 'react'

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
  collapsible?: boolean
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
    collapsible: true,
    items: [
      { to: '/evaluations/new', label: 'Nova Avaliação',  icon: FilePlus, minRole: 'Broker', tenantOnly: true },
      { to: '/clients',         label: 'Meus Clientes',    icon: UserCheck, tenantOnly: true },
    ],
  },
  {
    label: 'Gestão',
    collapsible: true,
    items: [
      { to: '/team',    label: 'Equipe',     icon: Users,    minRole: 'Manager', tenantOnly: true },
      { to: '/reports', label: 'Relatórios',  icon: BarChart2, minRole: 'Manager', tenantOnly: true },
      { to: '/audit',   label: 'Auditoria',   icon: Shield,   minRole: 'Manager', tenantOnly: true },
      { to: '/engine',  label: 'Motor',        icon: Cpu,      minRole: 'Manager', tenantOnly: true },
    ],
  },
  {
    label: 'Configurações',
    collapsible: true,
    items: [
      { to: '/settings', label: 'Configurações',       icon: Settings,   minRole: 'TenantOwner', tenantOnly: true },
      { to: '/billing',  label: 'Plano & Faturamento', icon: CreditCard, minRole: 'TenantOwner', tenantOnly: true },
    ],
  },
  {
    label: 'Plataforma',
    collapsible: true,
    items: [
      { to: '/admin/tenants',  label: 'Corretoras',         icon: Building2, minRole: 'SuperAdmin' },
      { to: '/admin/users',    label: 'Usuários Globais',   icon: Users,     minRole: 'SuperAdmin' },
      { to: '/admin/access',     label: 'Monitor de Acessos', icon: Eye,        minRole: 'SuperAdmin' },
      { to: '/admin/analytics',  label: 'Análise do Motor',   icon: BarChart3,  minRole: 'SuperAdmin' },
      { to: '/admin/health',     label: 'Saúde da Plataforma', icon: HeartPulse, minRole: 'SuperAdmin' },
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

  useEffect(() => {
    onMobileClose()
  }, [location.pathname, onMobileClose])

  function visible(item: NavItemDef) {
    if (isSuperAdmin) return item.minRole === 'SuperAdmin' || (!item.minRole && !item.tenantOnly)
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
        'fixed inset-y-0 left-0 z-50 flex flex-col overflow-x-hidden transition-all duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'w-[16.5rem] max-w-[85vw] lg:max-w-none lg:translate-x-0',
        collapsed ? 'lg:w-[4.5rem]' : 'lg:w-[16.5rem]',
      )}
      style={{ background: '#0c1527' }}
    >
      {/* ── Logo area ── */}
      <div className={cn(
        'flex h-[4.25rem] items-center px-5',
        collapsed ? 'lg:justify-center lg:px-0 lg:gap-0 gap-3' : 'gap-3',
      )}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-brand-500">
          <Activity className="h-[18px] w-[18px] text-white" />
        </div>
        <div className={cn('overflow-hidden transition-all duration-300', collapsed && 'lg:w-0 lg:opacity-0')}>
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-bold leading-none text-white tracking-tight">LifeTrigger</p>
            <span className="rounded bg-accent-500/20 px-1.5 py-0.5 text-[8px] font-bold text-accent-300 uppercase tracking-widest">
              Demo
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-none text-slate-500 font-medium">Engine v1.0.0</p>
        </div>

        <button
          onClick={onMobileClose}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white transition-colors lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="scrollbar-dark flex-1 overflow-y-auto overflow-x-hidden px-3 pt-2 pb-4">
        {visibleSections.map((section, idx) => (
          <SidebarSection
            key={section.label}
            section={section}
            collapsed={collapsed}
            isFirst={idx === 0}
            pathname={location.pathname}
          />
        ))}
      </nav>

      {/* ── Toggle + Footer ── */}
      <div className="px-3 pb-4">
        <div className="mx-2 mb-3 h-px bg-white/5" />
        <button
          onClick={onToggle}
          className={cn(
            'hidden lg:flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all',
            collapsed && 'justify-center',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium">Recolher menu</span>
            </>
          )}
        </button>
        <div className={cn(
          'mt-3 px-3 transition-all duration-300',
          collapsed && 'lg:hidden',
        )}>
          <p className="text-[10px] text-slate-600 font-medium">Desenvolvido por</p>
          <p className="text-[11px] font-semibold text-slate-500">AllTask Soluções Integradas</p>
        </div>
      </div>
    </aside>
  )
}

/* ── Section with collapsible support ── */
function SidebarSection({
  section,
  collapsed,
  isFirst,
  pathname,
}: {
  section: NavSection & { items: NavItemDef[] }
  collapsed: boolean
  isFirst: boolean
  pathname: string
}) {
  const hasActiveChild = section.items.some((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  )
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (hasActiveChild) setOpen(true)
  }, [hasActiveChild])

  return (
    <div className={cn(!isFirst && 'mt-4')}>
      {!collapsed ? (
        section.collapsible ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="mb-1 flex w-full items-center justify-between rounded-md px-3 py-1 group hover:bg-white/5 transition-colors"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 group-hover:text-slate-300 transition-colors">
              {section.label}
            </span>
            <ChevronRight className={cn(
              'h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-all duration-200',
              open && 'rotate-90',
            )} />
          </button>
        ) : (
          <p className={cn(
            'mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500',
            collapsed && 'lg:hidden',
          )}>
            {section.label}
          </p>
        )
      ) : (
        <>
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 lg:hidden">
            {section.label}
          </p>
          {!isFirst && (
            <div className="mx-auto mb-2 h-px w-6 bg-white/5 hidden lg:block" />
          )}
        </>
      )}

      <div className={cn(
        'space-y-0.5 transition-all duration-200',
        !open && !collapsed && 'max-h-0 overflow-hidden opacity-0',
        (open || collapsed) && 'max-h-[500px] opacity-100',
      )}>
        {section.items.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </div>
    </div>
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
          'group relative flex items-center gap-2.5 rounded-md px-3 py-[0.5rem] text-[0.8125rem] font-medium transition-all duration-150',
          collapsed && 'lg:justify-center lg:px-0',
          isActive
            ? 'bg-brand-500/15 text-brand-300'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn(
            'h-[18px] w-[18px] shrink-0',
            isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300',
          )} />
          <span className={cn('transition-all duration-300', collapsed && 'lg:hidden lg:w-0')}>{label}</span>
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 hidden lg:block z-50">
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}
