import { useEffect, useState } from 'react'
import {
  Building2, Plus, CheckCircle, XCircle,
  Loader2, RefreshCw, AlertCircle, X,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { getTenants, createTenant, updateTenantStatus } from '../lib/api'
import { formatDate } from '../lib/utils'
import type { Tenant } from '../types/api'

// ── Create Tenant Modal ───────────────────────────────────────────
function CreateTenantModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (tenant: Tenant) => void
}) {
  const [name, setName]       = useState('')
  const [slug, setSlug]       = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Auto-generate slug from name
  function handleNameChange(v: string) {
    setName(v)
    setSlug(v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 32))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setSaving(true)
    setError(null)
    try {
      const tenant = await createTenant(name.trim(), slug.trim())
      onCreated(tenant)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar corretora'
      setError(msg.includes('SLUG_TAKEN') ? `O slug "${slug}" já está em uso.` : msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-sm bg-white shadow-xl animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">Nova Corretora</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded-sm p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Nome da Corretora
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Corretora Alpha Ltda"
              className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Slug (identificador único)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32))}
              placeholder="corretora-alpha"
              className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm font-mono focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <p className="mt-1 text-[11px] text-slate-400">Apenas letras minúsculas, números e hífens</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-sm border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !slug.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-sm bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Criando…' : 'Criar Corretora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function TenantManagement() {
  const [tenants,      setTenants]      = useState<Tenant[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [togglingId,   setTogglingId]   = useState<string | null>(null)
  const [successId,    setSuccessId]    = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    getTenants()
      .then(setTenants)
      .catch(() => setError('Não foi possível carregar as corretoras. Verifique a conexão.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function toggleStatus(tenant: Tenant) {
    setTogglingId(tenant.id)
    try {
      const updated = await updateTenantStatus(tenant.id, !tenant.isActive)
      setTenants((prev) => prev.map((t) => t.id === updated.id ? updated : t))
      setSuccessId(tenant.id)
      setTimeout(() => setSuccessId(null), 2000)
    } catch {
      // Error will surface from API
    } finally {
      setTogglingId(null)
    }
  }

  function handleCreated(tenant: Tenant) {
    setTenants((prev) => [tenant, ...prev])
    setShowCreate(false)
  }

  const active   = tenants.filter((t) => t.isActive).length
  const inactive = tenants.filter((t) => !t.isActive).length

  return (
    <div>
      <TopBar
        title="Gerenciamento de Corretoras"
        subtitle={loading ? 'Carregando…' : `${tenants.length} corretora${tenants.length !== 1 ? 's' : ''} cadastrada${tenants.length !== 1 ? 's' : ''}`}
      />

      <div className="p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4 animate-fadeIn">

        {/* ── Actions bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="tabular-nums">{active}</span> ativa{active !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              <span className="tabular-nums">{inactive}</span> inativa{inactive !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-card hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-sm bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nova Corretora
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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
            <span className="text-sm">Carregando corretoras…</span>
          </div>
        )}

        {/* ── Tenant table ── */}
        {!loading && !error && (
          <div className="rounded-sm border border-slate-200 bg-white shadow-card overflow-hidden">
            {tenants.length === 0 ? (
              <div className="py-16 text-center">
                <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                <p className="text-sm font-semibold text-slate-700">Nenhuma corretora cadastrada</p>
                <p className="mt-1 text-xs text-slate-400">Crie a primeira corretora para começar.</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 flex items-center gap-2 mx-auto rounded-sm bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Nova Corretora
                </button>
              </div>
            ) : (
              <>
              {/* Mobile card list */}
              <div className="divide-y divide-slate-100 sm:hidden">
                {tenants.map((tenant) => (
                  <div key={tenant.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-brand-50">
                        <Building2 className="h-4 w-4 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{tenant.name}</p>
                        <span className="font-mono text-[11px] text-slate-400">/{tenant.slug}</span>
                      </div>
                      {tenant.isActive ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Ativa
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />Inativa
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pl-12">
                      <span className="text-[11px] text-slate-400">{formatDate(tenant.createdAt)}</span>
                      <button
                        onClick={() => toggleStatus(tenant)}
                        disabled={togglingId === tenant.id}
                        className={`flex items-center gap-1 rounded-sm border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                          tenant.isActive
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {togglingId === tenant.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : tenant.isActive ? (
                          <XCircle className="h-3 w-3" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        {tenant.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Corretora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Slug
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Criada em
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-brand-50">
                            <Building2 className="h-4 w-4 text-brand-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{tenant.name}</p>
                            <p className="text-[11px] font-mono text-slate-400">{tenant.id.slice(0, 18)}…</p>
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600">
                          {tenant.slug}
                        </span>
                      </td>

                      {/* Created at */}
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(tenant.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {successId === tenant.id ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Atualizado
                          </span>
                        ) : tenant.isActive ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Ativa
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                            <span className="h-2 w-2 rounded-full bg-slate-300" />
                            Inativa
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => toggleStatus(tenant)}
                          disabled={togglingId === tenant.id}
                          className={`flex items-center gap-1.5 ml-auto rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                            tenant.isActive
                              ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {togglingId === tenant.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : tenant.isActive ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                          {tenant.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Create modal ── */}
      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
