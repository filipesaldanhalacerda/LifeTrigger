import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, RotateCcw, AlertTriangle, Users, Zap, Loader2 } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { MetricCard } from '../components/ui/MetricCard'
import { Badge } from '../components/ui/Badge'
import { getPilotReport, getEvaluations, getActiveTenantId } from '../lib/api'
import { actionColors, actionLabel, riskColors, riskLabel, formatDate } from '../lib/utils'
import type { PilotReport, EvaluationSummary, RecommendedAction } from '../types/api'

const ACTION_ICONS: Record<RecommendedAction, React.ElementType> = {
  AUMENTAR: TrendingUp,
  MANTER: Minus,
  REDUZIR: TrendingDown,
  REVISAR: RotateCcw,
}

export default function Dashboard() {
  const [report, setReport]   = useState<PilotReport | null>(null)
  const [recent, setRecent]   = useState<EvaluationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    const tenantId = getActiveTenantId()
    if (!tenantId) { setLoading(false); return }
    try {
      const [pilotData, listData] = await Promise.allSettled([
        getPilotReport(tenantId, { limit: 500 }),
        getEvaluations(tenantId, { limit: 5 }),
      ])
      if (pilotData.status === 'fulfilled') setReport(pilotData.value)
      if (listData.status === 'fulfilled')  setRecent(listData.value.items)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const total       = report?.totalEvaluations || 1
  const critPct     = report ? Math.round((report.riskDistribution.critico / total) * 100) : 0
  const aumentarPct = report ? Math.round((report.actionDistribution.aumentar / total) * 100) : 0

  return (
    <div>
      <TopBar
        title="Dashboard"
        subtitle="Visão consolidada da carteira"
        onRefresh={load}
        isLoading={loading}
      />

      <div className="p-6 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        )}

        {!loading && !report && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Nenhum dado encontrado para este tenant. Realize avaliações para popular o dashboard.</span>
          </div>
        )}

        {!loading && report && (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard
                title="Total de Avaliações"
                value={report.totalEvaluations.toLocaleString('pt-BR')}
                icon={Users}
                iconColor="text-indigo-600"
                iconBg="bg-indigo-50"
              />
              <MetricCard
                title="Risco Crítico"
                value={`${critPct}%`}
                subtitle={`${report.riskDistribution.critico} avaliações`}
                icon={AlertTriangle}
                iconColor="text-red-600"
                iconBg="bg-red-50"
              />
              <MetricCard
                title="Ação: Aumentar"
                value={`${aumentarPct}%`}
                subtitle={`${report.actionDistribution.aumentar} clientes`}
                icon={TrendingUp}
                iconColor="text-orange-600"
                iconBg="bg-orange-50"
              />
              <MetricCard
                title="Gatilhos Registrados"
                value={report.triggerCount}
                subtitle="life events ativos"
                icon={Zap}
                iconColor="text-violet-600"
                iconBg="bg-violet-50"
              />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h2 className="mb-4 text-sm font-semibold text-slate-900">Distribuição de Risco</h2>
                <div className="space-y-3">
                  <DistBar label="Crítico" value={report.riskDistribution.critico} total={total} color="bg-red-500" />
                  <DistBar label="Moderado" value={report.riskDistribution.moderado} total={total} color="bg-amber-500" />
                  <DistBar label="Adequado" value={report.riskDistribution.adequado} total={total} color="bg-emerald-500" />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h2 className="mb-4 text-sm font-semibold text-slate-900">Distribuição de Ação</h2>
                <div className="space-y-3">
                  <DistBar label="Aumentar" value={report.actionDistribution.aumentar} total={total} color="bg-red-400" />
                  <DistBar label="Manter" value={report.actionDistribution.manter} total={total} color="bg-emerald-400" />
                  <DistBar label="Revisar" value={report.actionDistribution.revisar} total={total} color="bg-violet-400" />
                  <DistBar label="Reduzir" value={report.actionDistribution.reduzir} total={total} color="bg-sky-400" />
                </div>
              </div>
            </div>

            {/* Recent evaluations */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Avaliações Recentes</h2>
                <button
                  onClick={() => navigate('/evaluations')}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Ver todas →
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {recent.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-400">Nenhuma avaliação recente.</p>
                )}
                {recent.map((ev) => {
                  const ActionIcon = ACTION_ICONS[ev.action]
                  return (
                    <button
                      key={ev.id}
                      onClick={() => navigate(`/evaluations/${ev.id}`)}
                      className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <ActionIcon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-mono text-xs text-slate-500">{ev.id}</p>
                        <p className="text-xs text-slate-400">{formatDate(ev.timestamp)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={riskColors(ev.risk)} size="sm">
                          {riskLabel(ev.risk)}
                        </Badge>
                        <Badge className={actionColors(ev.action)} size="sm">
                          {actionLabel(ev.action)}
                        </Badge>
                        <span className="w-12 text-right text-sm font-semibold text-slate-700">
                          {ev.score.toFixed(0)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DistBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = Math.round((value / total) * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-slate-600">{label}</span>
      <div className="flex-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-2.5 rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-medium text-slate-700">{pct}%</span>
      <span className="w-8 text-right text-xs text-slate-400">{value}</span>
    </div>
  )
}
