import { useEffect, useState } from 'react'
import {
  Activity, Loader2, BarChart2, Users, Building2,
  TrendingUp, AlertTriangle, Target, Clock,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { getEvaluationAnalytics, getTenants, getUsers } from '../lib/api'
import type { EvaluationAnalytics } from '../lib/api'
import type { Tenant, UserRecord } from '../types/api'
import { today, daysAgo } from '../lib/dates'

function formatDateBR(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

const RISK_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  CRITICO:  { bg: 'bg-red-50',     text: 'text-red-700',     bar: 'bg-red-500' },
  MODERADO: { bg: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500' },
  ADEQUADO: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
}

const ACTION_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  AUMENTAR: { bg: 'bg-red-50',     text: 'text-red-700',     bar: 'bg-red-500' },
  REVISAR:  { bg: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500' },
  MANTER:   { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  REDUZIR:  { bg: 'bg-sky-50',     text: 'text-sky-700',     bar: 'bg-sky-500' },
}

export default function EngineAnalytics() {
  const [data, setData] = useState<EvaluationAnalytics | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(daysAgo(30))
  const [endDate, setEndDate] = useState(today())

  async function load(s: string, e: string) {
    setLoading(true)
    try {
      const [analytics, t, u] = await Promise.all([
        getEvaluationAnalytics(s, e),
        getTenants(),
        getUsers(),
      ])
      setData(analytics)
      setTenants(t)
      setUsers(u)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(startDate, endDate) }, [startDate, endDate])

  const tenantMap = new Map(tenants.map(t => [t.id, t.name]))
  const userMap = new Map(users.map(u => [u.id, u.email]))

  return (
    <div>
      <TopBar
        title="Análise do Motor"
        subtitle={loading ? 'Carregando…' : `${data?.total ?? 0} avaliações no período`}
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-fadeIn">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          maxDate={today()}
          onChange={(s, e) => { setStartDate(s); setEndDate(e) }}
        />

        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            <span className="text-sm">Carregando análises…</span>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard label="Total Avaliações" value={data.total} icon={Activity} iconBg="bg-brand-50" iconColor="text-brand-600" />
              <SummaryCard label="Score Médio" value={`${data.avgScore}%`} icon={Target} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <SummaryCard label="Gap Médio" value={`${data.avgGap}%`} icon={TrendingUp} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <SummaryCard label="Período" value={`${data.periodDays} dias`} icon={Clock} iconBg="bg-slate-100" iconColor="text-slate-500" />
            </div>

            {/* Charts row */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Risk distribution */}
              <DistributionCard
                title="Distribuição de Risco"
                items={data.riskDistribution.map(r => ({
                  label: r.risk,
                  count: r.count,
                  colors: RISK_COLORS[r.risk] ?? { bg: 'bg-slate-50', text: 'text-slate-700', bar: 'bg-slate-400' },
                }))}
                total={data.total}
              />

              {/* Action distribution */}
              <DistributionCard
                title="Ações Recomendadas"
                items={data.actionDistribution.map(a => ({
                  label: a.action,
                  count: a.count,
                  colors: ACTION_COLORS[a.action] ?? { bg: 'bg-slate-50', text: 'text-slate-700', bar: 'bg-slate-400' },
                }))}
                total={data.total}
              />
            </div>

            {/* Evaluations per day chart */}
            {data.perDay.length > 0 && (
              <EvalChart data={data.perDay} />
            )}

            {/* Per tenant and per user tables */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Per tenant */}
              {data.perTenant.length > 0 && (
                <RankingCard
                  title="Avaliações por Corretora"
                  icon={Building2}
                  items={data.perTenant.map(t => ({
                    label: tenantMap.get(t.tenantId) ?? t.tenantId.slice(0, 8) + '…',
                    count: t.count,
                    sub: timeAgo(t.lastEvaluation),
                  }))}
                  maxCount={data.perTenant[0]?.count ?? 1}
                />
              )}

              {/* Per user */}
              {data.perUser.length > 0 && (
                <RankingCard
                  title="Avaliações por Usuário"
                  icon={Users}
                  items={data.perUser.map(u => ({
                    label: userMap.get(u.userId) ?? u.userId.slice(0, 8) + '…',
                    count: u.count,
                    sub: timeAgo(u.lastEvaluation),
                  }))}
                  maxCount={data.perUser[0]?.count ?? 1}
                />
              )}
            </div>

            {/* Empty state */}
            {data.total === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <BarChart2 className="h-10 w-10 text-slate-200" />
                <p className="text-sm font-semibold text-slate-600">Nenhuma avaliação no período</p>
                <p className="text-xs text-slate-400">Selecione um período diferente ou aguarde novas avaliações.</p>
              </div>
            )}
          </>
        )}

        {!loading && !data && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <AlertTriangle className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Erro ao carregar dados</p>
            <p className="text-xs text-slate-400">Verifique se o engine-api está acessível.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function SummaryCard({ label, value, icon: Icon, iconBg, iconColor }: {
  label: string; value: number | string; icon: React.ElementType; iconBg: string; iconColor: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-lg font-bold tabular-nums text-slate-800">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
        </div>
      </div>
    </div>
  )
}

function DistributionCard({ title, items, total }: {
  title: string
  items: { label: string; count: number; colors: { bg: string; text: string; bar: string } }[]
  total: number
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>
      <div className="p-4 sm:p-5 space-y-3">
        {items.map(item => {
          const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0'
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.colors.bg} ${item.colors.text}`}>
                  {item.label}
                </span>
                <span className="text-xs tabular-nums text-slate-500">
                  {item.count.toLocaleString('pt-BR')} ({pct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${item.colors.bar}`}
                  style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%`, minWidth: item.count > 0 ? '4px' : '0' }}
                />
              </div>
            </div>
          )
        })}
        {items.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Sem dados</p>
        )}
      </div>
    </div>
  )
}

function EvalChart({ data }: { data: { date: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...data.map(d => d.count), 1)
  const total = data.reduce((s, d) => s + d.count, 0)
  const avg = data.length > 0 ? (total / data.length).toFixed(1) : '0'
  const labelEvery = Math.max(1, Math.ceil(data.length / 10))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Avaliações por Dia</h2>
          <p className="mt-0.5 text-xs text-slate-400">{data.length} dias · média {avg}/dia · total {total}</p>
        </div>
        {hover !== null && (
          <div className="text-right animate-fadeIn">
            <p className="text-lg font-bold tabular-nums text-brand-700">{data[hover].count}</p>
            <p className="text-[11px] text-slate-400">{formatDateBR(data[hover].date)}</p>
          </div>
        )}
      </div>
      <div className="px-4 sm:px-5 pb-4 sm:pb-5" onMouseLeave={() => setHover(null)}>
        <div className="flex items-end justify-center gap-[3px] sm:gap-1.5" style={{ height: 180 }}>
          {data.map((d, i) => {
            const pct = max > 0 ? (d.count / max) * 100 : 0
            const isHovered = hover === i
            return (
              <div
                key={d.date}
                className="flex flex-col items-center justify-end h-full relative"
                onMouseEnter={() => setHover(i)}
                style={{ cursor: 'pointer', width: `${Math.min(100 / data.length, 12)}%`, maxWidth: 48 }}
              >
                {isHovered && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] px-2 py-1 rounded-lg whitespace-nowrap z-10 shadow-lg pointer-events-none">
                    <span className="font-semibold">{d.count}</span> avaliações
                  </div>
                )}
                <div
                  className="w-full rounded-t transition-all duration-200"
                  style={{
                    height: `${Math.max(pct, 2)}%`,
                    minHeight: d.count > 0 ? 4 : 1,
                    background: isHovered ? 'var(--color-brand-600)' : 'var(--color-brand-400)',
                    opacity: hover !== null && !isHovered ? 0.45 : 1,
                  }}
                />
                {i % labelEvery === 0 && (
                  <span className="text-[10px] text-slate-400 leading-none mt-1.5 whitespace-nowrap">
                    {formatDateBR(d.date)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RankingCard({ title, icon: Icon, items, maxCount }: {
  title: string
  icon: React.ElementType
  items: { label: string; count: number; sub: string }[]
  maxCount: number
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 sm:px-5 py-4">
        <Icon className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        <span className="ml-auto text-xs text-slate-400">{items.length} registros</span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item, i) => (
          <div key={item.label} className="px-4 sm:px-5 py-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-slate-800 truncate">{item.label}</span>
              </div>
              <div className="text-right shrink-0 ml-3">
                <span className="text-sm font-bold tabular-nums text-slate-800">{item.count}</span>
                <span className="text-[11px] text-slate-400 ml-1.5">{item.sub}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-400 transition-all"
                style={{ width: `${(item.count / maxCount) * 100}%`, minWidth: '4px' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
