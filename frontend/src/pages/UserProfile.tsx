import { useState, type FormEvent } from 'react'
import { User, KeyRound, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { useAuth, type UserRole } from '../contexts/AuthContext'
import { resetUserPassword, ApiError } from '../lib/api'

// ── Role appearance (matches TeamManagement) ─────────────────────────────────
const ROLE_META: Record<UserRole, { label: string; color: string }> = {
  SuperAdmin:  { label: 'Super Admin',  color: 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40' },
  TenantOwner: { label: 'Proprietário', color: 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/40' },
  Manager:     { label: 'Gerente',      color: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40' },
  Broker:      { label: 'Corretor',     color: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40' },
  Viewer:      { label: 'Observador',   color: 'bg-slate-500/20 text-slate-400 ring-1 ring-slate-500/40' },
}

// ── Change Password section ───────────────────────────────────────────────────
function ChangePasswordSection({ userId }: { userId: string }) {
  const [newPassword, setNewPassword]   = useState('')
  const [confirm, setConfirm]           = useState('')
  const [error, setError]               = useState<string | null>(null)
  const [success, setSuccess]           = useState(false)
  const [loading, setLoading]           = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (newPassword !== confirm) { setError('As senhas não coincidem.'); return }
    if (newPassword.length < 8)  { setError('A senha deve ter pelo menos 8 caracteres.'); return }
    setError(null)
    setLoading(true)
    try {
      await resetUserPassword(userId, newPassword)
      setSuccess(true)
      setNewPassword('')
      setConfirm('')
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao alterar senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
          <KeyRound className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Alterar senha</h2>
          <p className="text-xs text-slate-500">Mínimo de 8 caracteres</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Nova senha</label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-colors"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Confirmar nova senha</label>
          <input
            type="password"
            required
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-colors"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Senha alterada com sucesso.
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Salvando…' : 'Alterar senha'}
        </button>
      </form>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UserProfile() {
  const { user } = useAuth()

  if (!user) return null

  const roleMeta = ROLE_META[user.role as UserRole]
  const initials  = user.email.slice(0, 2).toUpperCase()

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Meu Perfil</h1>
        <p className="mt-0.5 text-sm text-slate-500">Informações da sua conta</p>
      </div>

      {/* Identity card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100">
            <User className="h-4 w-4 text-brand-700" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Dados da conta</h2>
        </div>

        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-xl font-bold text-brand-700">
            {initials}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">E-mail</p>
              <p className="mt-0.5 text-sm text-slate-900">{user.email}</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Perfil</p>
                {roleMeta ? (
                  <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${roleMeta.color}`}>
                    {roleMeta.label}
                  </span>
                ) : (
                  <p className="mt-0.5 text-sm text-slate-900">{user.role}</p>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</p>
                {user.isActive ? (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle className="h-3.5 w-3.5" /> Ativo
                  </span>
                ) : (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                    Inativo
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">ID do usuário</p>
            <p className="mt-0.5 font-mono text-xs text-slate-700 tabular-nums">{user.id.slice(0, 8)}…</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Corretora</p>
            <p className="mt-0.5 font-mono text-xs text-slate-700 tabular-nums">
              {user.tenantId ? `${user.tenantId.slice(0, 8)}…` : '—'}
            </p>
          </div>
          {user.lastLoginAt && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Último acesso</p>
              <p className="mt-0.5 text-xs text-slate-700">
                {new Date(user.lastLoginAt).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Change password */}
      <ChangePasswordSection userId={user.id} />
    </div>
  )
}
