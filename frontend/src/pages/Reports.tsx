import { useEffect, useState, useCallback } from 'react'
import {
  TrendingUp,
  BarChart2, Users, AlertTriangle, Zap,
  Loader2, RefreshCw, Download,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { getPilotReport, getEvaluations, getUsers, getActiveTenantId } from '../lib/api'
import { actionLabel, riskLabel, formatDate } from '../lib/utils'
import type { PilotReport, EvaluationSummary, UserRecord } from '../types/api'

// ── Helpers ───────────────────────────────────────────────────────
function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function ninetyDaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return d.toISOString().slice(0, 10)
}

// Return the next day so the backend filter (<= endDate) includes the full selected day
function nextDay(date: string) {
  const d = new Date(date)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// ── Sub-components ─────────────────────────────────────────────────

function MetricCard({
  icon: Icon, iconBg, iconColor, label, value, sub, highlight = false,
}: {
  icon: React.ElementType
  iconBg: string; iconColor: string
  label: string; value: string | number
  sub?: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-card ${highlight ? 'border-orange-200' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-500 truncate">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  )
}

function DistBar({
  dot, label, value, total, barColor,
}: {
  dot: string; label: string
  value: number; total: number; barColor: string
}) {
  const p = pct(value, total)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
          <span className="text-xs font-semibold text-slate-700">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tabular-nums text-slate-700">{p}%</span>
          <span className="w-6 text-right text-[11px] tabular-nums text-slate-400">{value}</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-2 rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  )
}

// ── Broker performance row ─────────────────────────────────────────
interface BrokerStats {
  userId: string
  email: string
  total: number
  critico: number
  moderado: number
  adequado: number
  aumentar: number
}

function BrokerRow({ stats, rank }: { stats: BrokerStats; rank: number }) {
  const critPct = pct(stats.critico, stats.total)
  const adePct  = pct(stats.adequado, stats.total)
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-xs text-slate-400 font-mono tabular-nums">{rank}</td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-slate-800">{stats.email.split('@')[0]}</p>
        <p className="text-[11px] text-slate-400">{stats.email}</p>
      </td>
      <td className="px-4 py-3 text-sm font-bold text-slate-900 tabular-nums">{stats.total}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-red-500 transition-all" style={{ width: `${critPct}%` }} />
          </div>
          <span className={`text-xs font-semibold tabular-nums ${critPct > 40 ? 'text-red-600' : 'text-slate-500'}`}>
            {critPct}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${adePct}%` }} />
          </div>
          <span className="text-xs font-semibold tabular-nums text-slate-500">{adePct}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold tabular-nums ${pct(stats.aumentar, stats.total) > 50 ? 'text-orange-600' : 'text-slate-600'}`}>
          {stats.aumentar}
        </span>
        <span className="ml-1 text-[11px] text-slate-400">aumentar</span>
      </td>
    </tr>
  )
}

// ── CSV Export ─────────────────────────────────────────────────────
function csvCell(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n'))
    return `"${value.replace(/"/g, '""')}"`
  return value
}

function exportCsv(evals: EvaluationSummary[], users: UserRecord[]) {
  const userMap = new Map(users.map((u) => [u.id, u.email]))
  const BOM = '\uFEFF'
  const header = 'ID;Data;Ação;Risco;Score;Gap%;Canal;Corretor'
  const rows = evals.map((ev) => {
    const broker = ev.createdByUserId ? (userMap.get(ev.createdByUserId) ?? ev.createdByUserId) : ''
    return [
      ev.id,
      formatDate(ev.timestamp),
      actionLabel(ev.action),
      riskLabel(ev.risk),
      ev.score.toFixed(0),
      ev.gapPct.toFixed(1).replace('.', ','),
      ev.channel ?? '',
      broker,
    ].map(String).map(csvCell).join(';')
  })
  const csv = BOM + [header, ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main component ─────────────────────────────────────────────────
export default function Reports() {
  const [report,    setReport]    = useState<PilotReport | null>(null)
  const [evals,     setEvals]     = useState<EvaluationSummary[]>([])
  const [users,     setUsers]     = useState<UserRecord[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [startDate, setStartDate] = useState(ninetyDaysAgo())
  const [endDate,   setEndDate]   = useState(today())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const tenantId = getActiveTenantId()
    if (!tenantId) { setError('Nenhuma corretora selecionada.'); setLoading(false); return }
    try {
      const end = nextDay(endDate)
      const [pilotRes, evalsRes, usersRes] = await Promise.allSettled([
        getPilotReport(tenantId, { startDate, endDate: end, limit: 1000 }),
        getEvaluations(tenantId, { startDate, endDate: end, limit: 1000 }),
        getUsers(),
      ])
      if (pilotRes.status === 'fulfilled') setReport(pilotRes.value)
      else setError(`Erro ao carregar relatório: ${(pilotRes.reason as Error)?.message ?? 'desconhecido'}`)
      if (evalsRes.status === 'fulfilled') setEvals(evalsRes.value.items)
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { void load() }, [load])

  const total = report?.totalEvaluations ?? 0
  const critPct    = pct(report?.riskDistribution.critico ?? 0, total)
  const aumentarPct = pct(report?.actionDistribution.aumentar ?? 0, total)

  // ── Broker performance aggregation ──────────────────────────────
  const brokerStats: BrokerStats[] = (() => {
    const map = new Map<string, BrokerStats>()
    const brokers = users.filter((u) => u.role === 'Broker')
    brokers.forEach((u) => {
      map.set(u.id, { userId: u.id, email: u.email, total: 0, critico: 0, moderado: 0, adequado: 0, aumentar: 0 })
    })
    evals.forEach((ev) => {
      const uid = ev.createdByUserId
      if (!uid) return
      if (!map.has(uid)) {
        // Broker from another session or unknown
        const email = users.find((u) => u.id === uid)?.email ?? uid.slice(0, 8) + '…'
        map.set(uid, { userId: uid, email, total: 0, critico: 0, moderado: 0, adequado: 0, aumentar: 0 })
      }
      const s = map.get(uid)!
      s.total++
      if (ev.risk === 'CRITICO')  s.critico++
      if (ev.risk === 'MODERADO') s.moderado++
      if (ev.risk === 'ADEQUADO') s.adequado++
      if (ev.action === 'AUMENTAR') s.aumentar++
    })
    return [...map.values()].filter((s) => s.total > 0).sort((a, b) => b.total - a.total)
  })()

  return (
    <div>
      <TopBar
        title="Relatórios Gerenciais"
        subtitle={loading ? 'Carregando…' : `${total} avaliações no período`}
      />

      <div className="p-6 space-y-5 animate-fadeIn">

        {/* ── Date range + actions ── */}
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            maxDate={today()}
            onChange={(s, e) => { setStartDate(s); setEndDate(e) }}
          />
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-card hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Aplicar
          </button>
          <button
            onClick={() => exportCsv(evals, users)}
            disabled={evals.length === 0}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 shadow-card hover:bg-brand-100 transition-colors disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            <span className="text-sm">Carregando relatório…</span>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Erro ao carregar relatório</p>
              <p className="mt-0.5 text-xs">{error}</p>
            </div>
          </div>
        )}

        {!loading && report && (
          <>
            {/* ── Metric cards ── */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard
                icon={BarChart2}
                iconBg="bg-brand-50" iconColor="text-brand-600"
                label="Total de Avaliações"
                value={total.toLocaleString('pt-BR')}
                sub="no período selecionado"
              />
              <MetricCard
                icon={AlertTriangle}
                iconBg="bg-red-50" iconColor="text-red-500"
                label="Risco Crítico"
                value={`${critPct}%`}
                sub={`${report.riskDistribution.critico} clientes`}
                highlight={critPct > 30}
              />
              <MetricCard
                icon={TrendingUp}
                iconBg="bg-orange-50" iconColor="text-orange-500"
                label="Precisam Aumentar"
                value={`${aumentarPct}%`}
                sub={`${report.actionDistribution.aumentar} com gap`}
                highlight={aumentarPct > 40}
              />
              <MetricCard
                icon={Zap}
                iconBg="bg-violet-50" iconColor="text-violet-600"
                label="Gatilhos de Vida"
                value={report.triggerCount.toLocaleString('pt-BR')}
                sub="eventos no período"
              />
            </div>

            {/* ── Distribution charts ── */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Risk */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <h2 className="mb-1 text-sm font-bold text-slate-900">Perfil de Risco</h2>
                <p className="mb-4 text-xs text-slate-400">Distribuição das classificações no período</p>
                <div className="space-y-4">
                  <DistBar dot="bg-red-500"     label="Crítico"  value={report.riskDistribution.critico}  total={total} barColor="bg-red-500" />
                  <DistBar dot="bg-amber-400"   label="Moderado" value={report.riskDistribution.moderado} total={total} barColor="bg-amber-400" />
                  <DistBar dot="bg-emerald-500" label="Adequado" value={report.riskDistribution.adequado} total={total} barColor="bg-emerald-500" />
                </div>
              </div>

              {/* Action */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <h2 className="mb-1 text-sm font-bold text-slate-900">Recomendações do Motor</h2>
                <p className="mb-4 text-xs text-slate-400">Ação indicada para os clientes no período</p>
                <div className="space-y-4">
                  <DistBar dot="bg-red-400"     label="Aumentar" value={report.actionDistribution.aumentar} total={total} barColor="bg-red-400" />
                  <DistBar dot="bg-emerald-400" label="Manter"   value={report.actionDistribution.manter}   total={total} barColor="bg-emerald-400" />
                  <DistBar dot="bg-violet-400"  label="Revisar"  value={report.actionDistribution.revisar}  total={total} barColor="bg-violet-400" />
                  <DistBar dot="bg-sky-400"     label="Reduzir"  value={report.actionDistribution.reduzir}  total={total} barColor="bg-sky-400" />
                </div>
              </div>
            </div>

            {/* ── Broker performance table ── */}
            {brokerStats.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <h2 className="text-sm font-bold text-slate-900">Desempenho por Corretor</h2>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Avaliações realizadas por cada corretor no período selecionado
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-8">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Corretor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Avaliações</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">% Crítico</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">% Adequado</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Oportunidades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brokerStats.map((stats, i) => (
                        <BrokerRow key={stats.userId} stats={stats} rank={i + 1} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── No data state ── */}
            {total === 0 && (
              <div className="py-16 text-center">
                <BarChart2 className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                <p className="text-sm font-semibold text-slate-700">Nenhum dado no período</p>
                <p className="mt-1 text-xs text-slate-400">
                  Ajuste o intervalo de datas ou realize avaliações para gerar relatórios.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
