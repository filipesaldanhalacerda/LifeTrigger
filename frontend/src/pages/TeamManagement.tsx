import { useState, useEffect, useCallback } from 'react'
import {
  Users, UserPlus, KeyRound, Loader2, X,
  AlertCircle, CheckCircle, Search,
  ChevronDown, Lock,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { useAuth, type UserRole } from '../contexts/AuthContext'
import {
  getUsers, createUser, updateUserRole,
  resetUserPassword, ApiError,
} from '../lib/api'
import { formatDate } from '../lib/utils'
import type { UserRecord, CreateUserPayload } from '../types/api'

// ── Role metadata ─────────────────────────────────────────────────
const ROLE_META: Record<UserRole, {
  label: string
  badge: string       // cor do badge na tabela
  desc: string        // descrição para o seletor no modal
}> = {
  SuperAdmin:  {
    label: 'Super Admin',
    badge: 'bg-purple-100 text-purple-700',
    desc: 'Acesso total à plataforma Lifetrigger',
  },
  TenantOwner: {
    label: 'Proprietário',
    badge: 'bg-brand-100 text-brand-700',
    desc: 'Dono da corretora — gerencia plano, configurações e equipe',
  },
  Manager: {
    label: 'Gerente',
    badge: 'bg-blue-100 text-blue-700',
    desc: 'Gerencia corretores, vê relatórios e auditoria',
  },
  Broker: {
    label: 'Corretor',
    badge: 'bg-emerald-100 text-emerald-700',
    desc: 'Cria avaliações, registra gatilhos e atende clientes',
  },
  Viewer: {
    label: 'Observador',
    badge: 'bg-slate-100 text-slate-500',
    desc: 'Somente leitura — não pode criar ou editar nada',
  },
}

const ROLE_LEVEL: Record<UserRole, number> = {
  SuperAdmin: 5, TenantOwner: 4, Manager: 3, Broker: 2, Viewer: 1,
}

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role as UserRole]
  if (!meta) return <span className="text-xs text-slate-400">{role}</span>
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
      {meta.label}
    </span>
  )
}

function assignableRoles(callerRole: UserRole): UserRole[] {
  const level = ROLE_LEVEL[callerRole]
  return (Object.keys(ROLE_LEVEL) as UserRole[])
    .filter(r => ROLE_LEVEL[r] < level)
    .sort((a, b) => ROLE_LEVEL[b] - ROLE_LEVEL[a])
}

// ── Add User Modal ─────────────────────────────────────────────────
function AddUserModal({
  callerRole,
  tenantId,
  onClose,
  onCreated,
}: {
  callerRole: UserRole
  tenantId: string | null
  onClose: () => void
  onCreated: (user: UserRecord) => void
}) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState<UserRole>('Broker')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const roles = assignableRoles(callerRole)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload: CreateUserPayload = { email, password, role, tenantId }
      const created = await createUser(payload)
      onCreated(created)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.message.includes('EMAIL_TAKEN')
            ? 'Este e-mail já está cadastrado.'
            : err.message
        )
      } else {
        setError('Erro inesperado ao criar usuário.')
      }
    } finally {
      setLoading(false)
    }
  }

  const selectedMeta = ROLE_META[role]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Adicionar membro</h2>
            <p className="mt-0.5 text-xs text-slate-500">O usuário receberá acesso imediato ao sistema</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              E-mail corporativo
            </label>
            <input
              autoFocus
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="corretor@corretora.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
            />
          </div>

          {/* Senha temporária */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Senha temporária
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
            />
            <p className="mt-1 text-[11px] text-slate-400">O usuário pode alterar a senha após o primeiro acesso</p>
          </div>

          {/* Perfil */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Perfil de acesso
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
            >
              {roles.map(r => (
                <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>
              ))}
            </select>
            {/* Role description */}
            {selectedMeta && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <RoleBadge role={role} />
                <p className="text-[11px] text-slate-500 leading-relaxed">{selectedMeta.desc}</p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || roles.length === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {loading ? 'Criando…' : 'Adicionar membro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Reset Password Modal ───────────────────────────────────────────
function ResetPasswordModal({
  user,
  onClose,
}: {
  user: UserRecord
  onClose: () => void
}) {
  const [newPassword, setNewPassword] = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState(false)
  const [loading,     setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirm) { setError('As senhas não coincidem.'); return }
    setError(null)
    setLoading(true)
    try {
      await resetUserPassword(user.id, newPassword)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao redefinir a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Redefinir senha</h2>
            <p className="mt-0.5 text-xs text-slate-500 truncate max-w-xs">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Senha redefinida com sucesso</p>
                  <p className="mt-0.5 text-xs text-emerald-700">
                    O usuário deverá usar a nova senha no próximo acesso. Todos os tokens ativos foram revogados.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-700">
                Ao redefinir a senha, todas as sessões ativas do usuário serão encerradas.
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nova senha</label>
                <input
                  autoFocus
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirmar nova senha</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {loading ? 'Salvando…' : 'Redefinir senha'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Role Change Dropdown ───────────────────────────────────────────
function RoleDropdown({
  user,
  callerRole,
  onChangeRole,
}: {
  user: UserRecord
  callerRole: UserRole
  onChangeRole: (user: UserRecord, newRole: UserRole) => void
}) {
  const [open, setOpen] = useState(false)
  const roles = assignableRoles(callerRole).filter(r => r !== user.role)
  if (roles.length === 0) return <RoleBadge role={user.role} />

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 group"
        title="Clique para alterar o perfil"
      >
        <RoleBadge role={user.role} />
        <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-20 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Alterar perfil para
            </p>
            {roles.map(r => (
              <button
                key={r}
                onClick={() => { onChangeRole(user, r); setOpen(false) }}
                className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="mt-0.5">
                  <RoleBadge role={r} />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{ROLE_META[r]?.desc}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────
export default function TeamManagement() {
  const { user: me, logout } = useAuth()
  const [users,        setUsers]        = useState<UserRecord[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [resetTarget,  setResetTarget]  = useState<UserRecord | null>(null)
  const [search,       setSearch]       = useState('')
  const [filterRole,   setFilterRole]   = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [successId,    setSuccessId]    = useState<string | null>(null)

  const callerRole = (me?.role ?? 'Viewer') as UserRole

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await getUsers())
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('Sem permissão. Faça logout e login novamente para atualizar sua sessão.')
      } else {
        setError(err instanceof ApiError ? err.message : 'Erro ao carregar a equipe.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleChangeRole(target: UserRecord, newRole: UserRole) {
    try {
      const updated = await updateUserRole(target.id, newRole)
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
      setSuccessId(target.id)
      setTimeout(() => setSuccessId(null), 2500)
    } catch {
      // silently ignore
    }
  }

  function handleCreated(newUser: UserRecord) {
    setUsers(prev => [newUser, ...prev])
    setShowAddModal(false)
  }

  // Filtering
  const filtered = users.filter(u => {
    if (search       && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRole   && u.role !== filterRole)                                 return false
    if (filterStatus === 'active'   && !u.isActive) return false
    if (filterStatus === 'inactive' && u.isActive)  return false
    return true
  })

  const hasFilters   = !!(search || filterRole || filterStatus)
  const activeCount  = users.filter(u => u.isActive).length
  const canAddUser   = assignableRoles(callerRole).length > 0

  // Per-role counts for stats strip
  const roleCounts = (Object.keys(ROLE_META) as UserRole[]).reduce<Record<string, number>>(
    (acc, r) => { acc[r] = users.filter(u => u.role === r).length; return acc },
    {}
  )

  return (
    <div>
      <TopBar
        title="Gestão de Equipe"
        subtitle={
          loading
            ? 'Carregando…'
            : `${activeCount} ativo${activeCount !== 1 ? 's' : ''} · ${users.length} membro${users.length !== 1 ? 's' : ''} no total`
        }
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-fadeIn">

        {/* ── Filter section ── */}
        <div className="space-y-3">

          {/* Row 1: Search + Add button */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-0 sm:min-w-52">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por e-mail…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm shadow-card focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {canAddUser && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-card"
              >
                <UserPlus className="h-4 w-4" />
                Adicionar membro
              </button>
            )}
          </div>

          {/* Row 2: Status pills + Role pills + clear */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* Status pills */}
            {[
              { key: 'active',   label: 'Ativo',   dot: 'bg-emerald-500', activeBg: 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-100', activeText: 'text-emerald-700', count: activeCount },
              { key: 'inactive', label: 'Inativo',  dot: 'bg-slate-400',   activeBg: 'bg-slate-100 border-slate-300 ring-2 ring-slate-200',     activeText: 'text-slate-600',    count: users.length - activeCount },
            ].map(opt => {
              const isActive = filterStatus === opt.key
              if (opt.count === 0 && !isActive) return null
              return (
                <button
                  key={opt.key}
                  onClick={() => setFilterStatus(isActive ? '' : opt.key)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                    isActive ? `${opt.activeBg} ${opt.activeText}` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${opt.dot}`} />
                  {opt.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    isActive ? 'bg-white/60 text-inherit' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {opt.count}
                  </span>
                </button>
              )
            })}

            {/* Separator */}
            {users.length > 0 && <div className="h-4 w-px bg-slate-200 mx-1" />}

            {/* Role pills */}
            {(Object.keys(ROLE_META) as UserRole[]).map(role => {
              const count = roleCounts[role]
              if (!count) return null
              const isActive = filterRole === role
              return (
                <button
                  key={role}
                  onClick={() => setFilterRole(isActive ? '' : role)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-50 border-brand-300 ring-2 ring-brand-100 text-brand-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {ROLE_META[role].label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    isActive ? 'bg-brand-200 text-brand-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setFilterRole(''); setFilterStatus('') }}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors ml-auto"
              >
                <X className="h-3 w-3" />
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Não foi possível carregar a equipe</p>
              <p className="mt-0.5 text-xs">{error}</p>
              {error.includes('Sem permissão') && (
                <button
                  onClick={() => void logout()}
                  className="mt-2 text-xs font-semibold underline hover:opacity-80"
                >
                  Fazer logout agora
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0">
                <div className="h-8 w-8 rounded-full skeleton shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 rounded skeleton" />
                  <div className="h-2.5 w-20 rounded skeleton" />
                </div>
                <div className="h-5 w-16 rounded-full skeleton" />
                <div className="h-3 w-24 rounded skeleton hidden sm:block" />
              </div>
            ))}
          </div>
        )}

        {/* ── Table ── */}
        {!loading && !error && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">

            {/* Table hint */}
            {filtered.length > 0 && (
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
                <p className="text-[11px] text-slate-500">
                  <span className="font-semibold tabular-nums text-slate-700">{filtered.length}</span> membro{filtered.length !== 1 ? 's' : ''} exibido{filtered.length !== 1 ? 's' : ''}
                  {hasFilters && ' com filtro aplicado'}
                  {' — '}
                  clique no perfil de um membro para alterá-lo, ou em Ativar/Desativar para controlar o acesso.
                </p>
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                {users.length === 0 ? (
                  <>
                    <p className="text-sm font-semibold text-slate-700">Nenhum membro na equipe ainda</p>
                    <p className="mt-1 text-xs text-slate-400">Adicione o primeiro membro para começar a delegar acessos.</p>
                    {canAddUser && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="mt-4 flex items-center gap-2 mx-auto rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                      >
                        <UserPlus className="h-4 w-4" />
                        Adicionar primeiro membro
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-700">Nenhum resultado para o filtro aplicado</p>
                    <p className="mt-1 text-xs text-slate-400">Tente remover os filtros ou buscar por outro e-mail.</p>
                    <button
                      onClick={() => { setSearch(''); setFilterRole(''); setFilterStatus('') }}
                      className="mt-3 text-xs font-semibold text-brand-600 hover:underline"
                    >
                      Limpar filtros
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
              {/* Mobile card list */}
              <div className="divide-y divide-slate-100 sm:hidden">
                {filtered.map((u) => {
                  const canManage = ROLE_LEVEL[callerRole] > ROLE_LEVEL[u.role as UserRole]
                  return (
                    <div key={u.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${u.isActive ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'}`}>
                          {u.email.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${u.isActive ? 'text-slate-800' : 'text-slate-400'}`}>{u.email}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {u.isActive ? (
                              <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Ativo
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />Inativo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pl-12">
                        <div>
                          {canManage
                            ? <RoleDropdown user={u} callerRole={callerRole} onChangeRole={handleChangeRole} />
                            : <RoleBadge role={u.role} />
                          }
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-slate-400">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Nunca acessou'}</p>
                          <p className="text-[10px] text-slate-300">desde {formatDate(u.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Membro</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Perfil
                      <span className="ml-1 font-normal normal-case text-slate-400">clicável</span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Último acesso</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Membro desde</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(u => {
                    const canManage = ROLE_LEVEL[callerRole] > ROLE_LEVEL[u.role as UserRole]
                    const isSuccess  = successId  === u.id

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        {/* User */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${u.isActive ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'}`}>
                              {u.email.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className={`font-medium truncate ${u.isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                                {u.email}
                              </p>
                              {/* Inline status pill */}
                              {u.isActive ? (
                                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Ativo
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                  Inativo
                                </span>
                              )}
                            </div>
                            {/* Success flash */}
                            {isSuccess && (
                              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 animate-pulse" />
                            )}
                          </div>
                        </td>

                        {/* Role — clicável se pode gerenciar */}
                        <td className="px-4 py-3.5">
                          {canManage
                            ? <RoleDropdown user={u} callerRole={callerRole} onChangeRole={handleChangeRole} />
                            : <RoleBadge role={u.role} />
                          }
                        </td>

                        {/* Last login */}
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {u.lastLoginAt ? formatDate(u.lastLoginAt) : <span className="text-slate-300">Nunca acessou</span>}
                        </td>

                        {/* Created at */}
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {formatDate(u.createdAt)}
                        </td>

                        {/* Actions — disabled in demo */}
                        <td className="px-4 py-3.5">
                          {canManage ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                disabled
                                title="Indisponível na versão demo"
                                className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-400 cursor-not-allowed"
                              >
                                <Lock className="h-3 w-3" />
                                Senha
                              </button>
                              <button
                                disabled
                                title="Indisponível na versão demo"
                                className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-400 cursor-not-allowed"
                              >
                                <Lock className="h-3 w-3" />
                                {u.isActive ? 'Desativar' : 'Ativar'}
                              </button>
                            </div>
                          ) : (
                            <span className="block text-right text-[11px] text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
              </>
            )}
          </div>
        )}

        {/* ── Demo notice ── */}
        {!loading && !error && users.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-3.5 w-3.5 text-amber-600" />
              <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">Versão de Demonstração</p>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Na versão demo, a redefinição de senha e a ativação/desativação de usuários estão desabilitadas
              para preservar as credenciais compartilhadas. A alteração de perfil (role) está liberada para que você
              explore as diferentes permissões. Na versão de produção, todas as funcionalidades estarão disponíveis.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddUserModal
          callerRole={callerRole}
          tenantId={me?.tenantId ?? null}
          onClose={() => setShowAddModal(false)}
          onCreated={handleCreated}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  )
}
