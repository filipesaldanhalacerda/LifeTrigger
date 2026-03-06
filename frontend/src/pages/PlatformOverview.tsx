import { useEffect, useState } from 'react'
import {
  Building2, Users, TrendingUp, AlertTriangle,
  Loader2, RefreshCw, Activity,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { getTenants, getPilotReport } from '../lib/api'
import { formatDate } from '../lib/utils'
import type { Tenant, PilotReport } from '../types/api'

// ── Helpers ───────────────────────────────────────────────────────
function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

// ── Tenant row with lazy-loaded stats ─────────────────────────────
interface TenantWithStats {
  tenant: Tenant
  report: PilotReport | null
  loadingReport: boolean
}

function TenantRow({ row }: { row: TenantWithStats }) {
  const { tenant, report, loadingReport } = row
  const total    = report?.totalEvaluations ?? 0
  const critPct  = pct(report?.riskDistribution.critico ?? 0, total)
  const adePct   = pct(report?.riskDistribution.adequado ?? 0, total)

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      {/* Tenant name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
            <Building2 className="h-4 w-4 text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{tenant.name}</p>
            <p className="text-[11px] font-mono text-slate-400">{tenant.slug}</p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        {tenant.isActive ? (
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

      {/* Created at */}
      <td className="px-4 py-3 text-xs text-slate-500">
        {formatDate(tenant.createdAt)}
      </td>

      {/* Evaluations */}
      <td className="px-4 py-3">
        {loadingReport ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
        ) : (
          <span className="text-sm font-bold text-slate-800 tabular-nums">{total.toLocaleString('pt-BR')}</span>
        )}
      </td>

      {/* Risk critical % */}
      <td className="px-4 py-3">
        {loadingReport ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
        ) : total === 0 ? (
          <span className="text-xs text-slate-300">—</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full bg-red-500 transition-all" style={{ width: `${critPct}%` }} />
            </div>
            <span className={`text-xs font-semibold tabular-nums ${critPct > 40 ? 'text-red-600' : 'text-slate-500'}`}>
              {critPct}%
            </span>
          </div>
        )}
      </td>

      {/* Adequado % */}
      <td className="px-4 py-3">
        {loadingReport ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
        ) : total === 0 ? (
          <span className="text-xs text-slate-300">—</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${adePct}%` }} />
            </div>
            <span className="text-xs font-semibold tabular-nums text-slate-500">{adePct}%</span>
          </div>
        )}
      </td>

      {/* Triggers */}
      <td className="px-4 py-3">
        {loadingReport ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
        ) : (
          <span className="text-xs text-slate-600 tabular-nums">{report?.triggerCount ?? 0}</span>
        )}
      </td>
    </tr>
  )
}

function TenantCard({ row }: { row: TenantWithStats }) {
  const { tenant, report, loadingReport } = row
  const total    = report?.totalEvaluations ?? 0
  const critPct  = pct(report?.riskDistribution.critico ?? 0, total)
  const adePct   = pct(report?.riskDistribution.adequado ?? 0, total)

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
          <Building2 className="h-4 w-4 text-brand-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 truncate">{tenant.name}</p>
          <p className="text-[11px] font-mono text-slate-400">{tenant.slug}</p>
        </div>
        {tenant.isActive ? (
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
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-slate-400">Criada</p>
          <p className="font-medium text-slate-600">{formatDate(tenant.createdAt)}</p>
        </div>
        <div>
          <p className="text-slate-400">Avaliações</p>
          {loadingReport ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
          ) : (
            <p className="font-bold text-slate-800 tabular-nums">{total.toLocaleString('pt-BR')}</p>
          )}
        </div>
        <div>
          <p className="text-slate-400">% Crítico</p>
          {loadingReport ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
          ) : total === 0 ? (
            <p className="text-slate-300">—</p>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${critPct}%` }} />
              </div>
              <span className={`font-semibold tabular-nums ${critPct > 40 ? 'text-red-600' : 'text-slate-500'}`}>
                {critPct}%
              </span>
            </div>
          )}
        </div>
        <div>
          <p className="text-slate-400">% Adequado</p>
          {loadingReport ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
          ) : total === 0 ? (
            <p className="text-slate-300">—</p>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${adePct}%` }} />
              </div>
              <span className="font-semibold tabular-nums text-slate-500">{adePct}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Gatilhos</span>
        {loadingReport ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
        ) : (
          <span className="font-semibold text-slate-600 tabular-nums">{report?.triggerCount ?? 0}</span>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function PlatformOverview() {
  const [rows,    setRows]    = useState<TenantWithStats[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const tenants = await getTenants()
      const initial = tenants.map((t) => ({ tenant: t, report: null, loadingReport: t.isActive }))
      setRows(initial)
      setLoading(false)

      // Fetch pilot reports for active tenants in parallel
      const active = tenants.filter((t) => t.isActive)
      await Promise.allSettled(
        active.map(async (t) => {
          try {
            const report = await getPilotReport(t.id, { limit: 1000 })
            setRows((prev) =>
              prev.map((r) => r.tenant.id === t.id ? { ...r, report, loadingReport: false } : r)
            )
          } catch {
            setRows((prev) =>
              prev.map((r) => r.tenant.id === t.id ? { ...r, loadingReport: false } : r)
            )
          }
        })
      )
    } catch {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const totalEvals  = rows.reduce((sum, r) => sum + (r.report?.totalEvaluations ?? 0), 0)
  const activeTenants = rows.filter((r) => r.tenant.isActive).length

  return (
    <div>
      <TopBar
        title="Visão da Plataforma"
        subtitle={loading ? 'Carregando…' : `${rows.length} corretora${rows.length !== 1 ? 's' : ''} · ${totalEvals.toLocaleString('pt-BR')} avaliações`}
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-fadeIn">

        {/* ── Summary cards ── */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Corretoras</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{rows.length}</p>
                  <p className="mt-0.5 text-xs text-slate-500"><span className="tabular-nums">{activeTenants}</span> ativas</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                  <Building2 className="h-5 w-5 text-brand-600" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Avaliações Totais</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{totalEvals.toLocaleString('pt-BR')}</p>
                  <p className="mt-0.5 text-xs text-slate-500">todas as corretoras</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <Activity className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Risco Crítico Global</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
                    {totalEvals > 0 ? pct(rows.reduce((s, r) => s + (r.report?.riskDistribution.critico ?? 0), 0), totalEvals) : 0}%
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">da carteira total</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gatilhos de Vida</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
                    {rows.reduce((s, r) => s + (r.report?.triggerCount ?? 0), 0).toLocaleString('pt-BR')}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">eventos registrados</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                  <TrendingUp className="h-5 w-5 text-violet-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            <span className="text-sm">Carregando dados da plataforma…</span>
          </div>
        )}

        {/* ── Tenants table ── */}
        {!loading && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Users className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Corretoras na Plataforma</h2>
              <button
                onClick={() => void load()}
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Atualizar
              </button>
            </div>
            {rows.length === 0 ? (
              <div className="py-16 text-center">
                <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                <p className="text-sm font-semibold text-slate-700">Nenhuma corretora cadastrada</p>
                <p className="mt-1 text-xs text-slate-400">Acesse Corretoras para cadastrar a primeira.</p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="divide-y divide-slate-100 sm:hidden">
                  {rows.map((row) => (
                    <TenantCard key={row.tenant.id} row={row} />
                  ))}
                </div>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Corretora</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Criada</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Avaliações</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">% Crítico</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">% Adequado</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Gatilhos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <TenantRow key={row.tenant.id} row={row} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
