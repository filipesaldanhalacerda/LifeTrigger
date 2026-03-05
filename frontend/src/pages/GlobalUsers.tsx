import { useEffect, useState } from 'react'
import {
  Search, Filter, UserCheck, UserX, CheckCircle,
  Loader2, RefreshCw, AlertCircle, Building2,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { getUsers, getTenants, updateUserStatus } from '../lib/api'
import { formatDate } from '../lib/utils'
import type { UserRecord, Tenant } from '../types/api'

// ── Role badge ─────────────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; bg: string; text: string }> = {
  SuperAdmin:  { label: 'Super Admin',   bg: 'bg-purple-100',  text: 'text-purple-700' },
  TenantOwner: { label: 'Dono',          bg: 'bg-brand-100',   text: 'text-brand-700'  },
  Manager:     { label: 'Gerente',       bg: 'bg-blue-100',    text: 'text-blue-700'   },
  Broker:      { label: 'Corretor',      bg: 'bg-emerald-100', text: 'text-emerald-700' },
  Viewer:      { label: 'Observador',    bg: 'bg-slate-100',   text: 'text-slate-500'  },
}

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? { label: role, bg: 'bg-slate-100', text: 'text-slate-600' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.text}`}>
      {meta.label}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function GlobalUsers() {
  const [users,      setUsers]      = useState<UserRecord[]>([])
  const [tenants,    setTenants]    = useState<Tenant[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [filterRole, setFilterRole] = useState<string>('')
  const [filterTenant, setFilterTenant] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [successId,  setSuccessId]  = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [usersRes, tenantsRes] = await Promise.allSettled([getUsers(), getTenants()])
      if (usersRes.status === 'fulfilled')   setUsers(usersRes.value)
      if (tenantsRes.status === 'fulfilled') setTenants(tenantsRes.value)
      if (usersRes.status === 'rejected')    setError('Não foi possível carregar os usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function toggleStatus(user: UserRecord) {
    setTogglingId(user.id)
    try {
      const updated = await updateUserStatus(user.id, !user.isActive)
      setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u))
      setSuccessId(user.id)
      setTimeout(() => setSuccessId(null), 2000)
    } catch {
      // silently fail
    } finally {
      setTogglingId(null)
    }
  }

  // Build tenant name map
  const tenantMap = new Map(tenants.map((t) => [t.id, t.name]))

  // Filter
  const filtered = users.filter((u) => {
    if (search && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRole && u.role !== filterRole) return false
    if (filterTenant && u.tenantId !== filterTenant) return false
    if (filterStatus === 'active'   && !u.isActive) return false
    if (filterStatus === 'inactive' && u.isActive)  return false
    return true
  })

  const hasFilters = !!(search || filterRole || filterTenant || filterStatus)

  function clearFilters() {
    setSearch('')
    setFilterRole('')
    setFilterTenant('')
    setFilterStatus('')
  }

  // Stats
  const activeCount   = users.filter((u) => u.isActive).length
  const inactiveCount = users.filter((u) => !u.isActive).length

  return (
    <div>
      <TopBar
        title="Usuários Globais"
        subtitle={loading ? 'Carregando…' : `${users.length} usuário${users.length !== 1 ? 's' : ''} na plataforma`}
        onRefresh={load}
        isLoading={loading}
      />

      <div className="p-6 space-y-5 animate-fadeIn">

        {/* ── Stats strip ── */}
        {!loading && (
          <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-card">
            <span className="text-xs text-slate-500">Total: <span className="font-bold text-slate-800 tabular-nums">{users.length}</span></span>
            <span className="text-xs text-slate-500">Ativos: <span className="font-bold text-emerald-700 tabular-nums">{activeCount}</span></span>
            <span className="text-xs text-slate-500">Inativos: <span className="font-bold text-slate-400 tabular-nums">{inactiveCount}</span></span>
            {Object.keys(ROLE_META).map((role) => {
              const count = users.filter((u) => u.role === role).length
              if (count === 0) return null
              return (
                <span key={role} className="text-xs text-slate-500">
                  {ROLE_META[role].label}: <span className="font-bold text-slate-700 tabular-nums">{count}</span>
                </span>
              )
            })}
          </div>
        )}

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por e-mail…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-card focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className={`h-4 w-4 ${hasFilters ? 'text-brand-500' : 'text-slate-400'}`} />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-card focus:border-brand-400 focus:outline-none"
            >
              <option value="">Todos os perfis</option>
              {Object.entries(ROLE_META).map(([role, meta]) => (
                <option key={role} value={role}>{meta.label}</option>
              ))}
            </select>
            <select
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-card focus:border-brand-400 focus:outline-none"
            >
              <option value="">Todas as corretoras</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-card focus:border-brand-400 focus:outline-none"
            >
              <option value="">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-card hover:text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Limpar filtros
              </button>
            )}
            <button
              onClick={() => void load()}
              disabled={loading}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-card hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Erro ao carregar</p>
              <p className="mt-0.5 text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            <span className="text-sm">Carregando usuários…</span>
          </div>
        )}

        {/* ── Table ── */}
        {!loading && !error && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Search className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                <p className="text-sm font-semibold text-slate-700">Nenhum usuário encontrado</p>
                <p className="mt-1 text-xs text-slate-400">Tente ajustar os filtros.</p>
                {hasFilters && (
                  <button onClick={clearFilters} className="mt-3 text-xs text-brand-600 hover:underline">
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
                  <p className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700 tabular-nums">{filtered.length}</span> de <span className="tabular-nums">{users.length}</span> usuários
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Usuário</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Perfil</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Corretora</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Criado</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Último login</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        {/* User */}
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-800">{user.email}</p>
                            <p className="text-[11px] font-mono text-slate-400">{user.id.slice(0, 16)}…</p>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3">
                          <RoleBadge role={user.role} />
                        </td>

                        {/* Tenant */}
                        <td className="px-4 py-3">
                          {user.tenantId ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs text-slate-600">
                                {tenantMap.get(user.tenantId) ?? user.tenantId.slice(0, 8) + '…'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Plataforma</span>
                          )}
                        </td>

                        {/* Created */}
                        <td className="px-4 py-3 text-xs text-slate-500">{formatDate(user.createdAt)}</td>

                        {/* Last login */}
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {user.lastLoginAt ? formatDate(user.lastLoginAt) : <span className="text-slate-300">Nunca</span>}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {successId === user.id ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Atualizado
                            </span>
                          ) : user.isActive ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Ativo
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                              <span className="h-2 w-2 rounded-full bg-slate-300" />
                              Inativo
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => toggleStatus(user)}
                            disabled={togglingId === user.id || user.role === 'SuperAdmin'}
                            title={user.role === 'SuperAdmin' ? 'SuperAdmins não podem ser desativados aqui' : undefined}
                            className={`flex items-center gap-1.5 ml-auto rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
                              user.isActive
                                ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {togglingId === user.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : user.isActive ? (
                              <UserX className="h-3.5 w-3.5" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                            {user.isActive ? 'Desativar' : 'Ativar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
