import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, RotateCcw, AlertTriangle, Users, Zap } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { MetricCard } from '../components/ui/MetricCard'
import { Badge } from '../components/ui/Badge'
import { getPilotReport, getActiveTenantId, fetchDemoToken, getToken } from '../lib/api'
import { actionColors, actionLabel, riskColors, riskLabel, formatDate } from '../lib/utils'
import type { PilotReport, RecommendedAction, RiskClassification } from '../types/api'

// Fallback mock data when API is unavailable
const MOCK_REPORT: PilotReport = {
  totalEvaluations: 248,
  riskDistribution: { critico: 30, moderado: 45, adequado: 25 },
  actionDistribution: { aumentar: 45, manter: 30, reduzir: 10, revisar: 15 },
  triggerCount: 22,
}

const MOCK_RECENT = [
  { id: '7f3a1b20-0001-0000-0000-000000000001', timestamp: '2026-02-25T14:32:00Z', action: 'AUMENTAR' as RecommendedAction, risk: 'CRITICO' as RiskClassification, score: 28, gap: 68.4 },
  { id: '7f3a1b20-0002-0000-0000-000000000002', timestamp: '2026-02-25T12:10:00Z', action: 'MANTER' as RecommendedAction, risk: 'ADEQUADO' as RiskClassification, score: 82, gap: -3.1 },
  { id: '7f3a1b20-0003-0000-0000-000000000003', timestamp: '2026-02-25T09:45:00Z', action: 'REVISAR' as RecommendedAction, risk: 'MODERADO' as RiskClassification, score: 55, gap: 15.0 },
  { id: '7f3a1b20-0004-0000-0000-000000000004', timestamp: '2026-02-24T17:20:00Z', action: 'REDUZIR' as RecommendedAction, risk: 'ADEQUADO' as RiskClassification, score: 77, gap: -28.5 },
]

const ACTION_ICONS: Record<RecommendedAction, React.ElementType> = {
  AUMENTAR: TrendingUp,
  MANTER: Minus,
  REDUZIR: TrendingDown,
  REVISAR: RotateCcw,
}

export default function Dashboard() {
  const [report, setReport] = useState<PilotReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (!getToken()) await fetchDemoToken(getActiveTenantId())
      const data = await getPilotReport(getActiveTenantId(), { limit: 500 })
      setReport(data)
      setIsMock(false)
    } catch {
      setReport(MOCK_REPORT)
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const r = report ?? MOCK_REPORT
  const total = r.totalEvaluations || 1
  const critPct = Math.round((r.riskDistribution.critico / total) * 100)
  const aumentarPct = Math.round((r.actionDistribution.aumentar / total) * 100)

  return (
    <div>
      <TopBar
        title="Dashboard"
        subtitle="Visão consolidada da carteira"
        onRefresh={load}
        isLoading={loading}
      />

      <div className="p-6 space-y-6">
        {/* Mock banner */}
        {isMock && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>API indisponível — exibindo dados de demonstração. Inicie o backend em <code className="font-mono">localhost:5001</code>.</span>
          </div>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            title="Total de Avaliações"
            value={r.totalEvaluations.toLocaleString('pt-BR')}
            icon={Users}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50"
          />
          <MetricCard
            title="Risco Crítico"
            value={`${critPct}%`}
            subtitle={`${r.riskDistribution.critico} avaliações`}
            icon={AlertTriangle}
            iconColor="text-red-600"
            iconBg="bg-red-50"
          />
          <MetricCard
            title="Ação: Aumentar"
            value={`${aumentarPct}%`}
            subtitle={`${r.actionDistribution.aumentar} clientes`}
            icon={TrendingUp}
            iconColor="text-orange-600"
            iconBg="bg-orange-50"
          />
          <MetricCard
            title="Gatilhos Registrados"
            value={r.triggerCount}
            subtitle="life events ativos"
            icon={Zap}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Risk distribution */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Distribuição de Risco</h2>
            <div className="space-y-3">
              <DistBar label="Crítico" value={r.riskDistribution.critico} total={total} color="bg-red-500" />
              <DistBar label="Moderado" value={r.riskDistribution.moderado} total={total} color="bg-amber-500" />
              <DistBar label="Adequado" value={r.riskDistribution.adequado} total={total} color="bg-emerald-500" />
            </div>
          </div>

          {/* Action distribution */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Distribuição de Ação</h2>
            <div className="space-y-3">
              <DistBar label="Aumentar" value={r.actionDistribution.aumentar} total={total} color="bg-red-400" />
              <DistBar label="Manter" value={r.actionDistribution.manter} total={total} color="bg-emerald-400" />
              <DistBar label="Revisar" value={r.actionDistribution.revisar} total={total} color="bg-violet-400" />
              <DistBar label="Reduzir" value={r.actionDistribution.reduzir} total={total} color="bg-sky-400" />
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
            {MOCK_RECENT.map((ev) => {
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
                      {ev.score}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
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
