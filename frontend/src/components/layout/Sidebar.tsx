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
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'

type UserRole = 'SuperAdmin' | 'TenantAdmin' | 'Partner' | 'ReadOnly'

interface NavItemDef {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
  minRole?: UserRole
}

const mainItems: NavItemDef[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/evaluations/new', label: 'Nova Avaliação', icon: FilePlus, minRole: 'Partner' },
  { to: '/evaluations', label: 'Histórico', icon: History },
  { to: '/triggers/new', label: 'Gatilhos de Vida', icon: Zap, minRole: 'Partner' },
]

const adminItems: NavItemDef[] = [
  { to: '/settings', label: 'Configurações', icon: Settings, minRole: 'TenantAdmin' },
  { to: '/audit', label: 'Auditoria', icon: Shield, minRole: 'TenantAdmin' },
  { to: '/engine', label: 'Motor', icon: Cpu, minRole: 'TenantAdmin' },
]

export function Sidebar() {
  const { hasRole } = useAuth()

  const visibleMain = mainItems.filter((item) => !item.minRole || hasRole(item.minRole))
  const visibleAdmin = adminItems.filter((item) => !item.minRole || hasRole(item.minRole))

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <Activity className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-white">LifeTrigger</p>
          <p className="mt-0.5 text-[11px] leading-none text-slate-400">Engine v1.0.0</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Principal
        </p>
        {visibleMain.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {visibleAdmin.length > 0 && (
          <>
            <p className="mb-2 mt-5 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Administração
            </p>
            {visibleAdmin.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 px-5 py-4">
        <p className="text-[11px] text-slate-500">Motor de Inteligência de</p>
        <p className="text-[11px] text-slate-500">Proteção de Vida · B2B SaaS</p>
      </div>
    </aside>
  )
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  )
}
