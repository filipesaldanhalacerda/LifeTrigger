import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Minus, RotateCcw,
  AlertTriangle, Users, Zap, FilePlus,
  ChevronRight, Activity, EyeOff,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Badge } from '../components/ui/Badge'
import { getPilotReport, getEvaluations, getActiveTenantId } from '../lib/api'
import {
  actionColors, actionLabel, riskColors, riskLabel, formatDate,
} from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import type { PilotReport, EvaluationSummary, RecommendedAction } from '../types/api'

const ACTION_ICONS: Record<RecommendedAction, React.ElementType> = {
  AUMENTAR: TrendingUp,
  MANTER:   Minus,
  REDUZIR:  TrendingDown,
  REVISAR:  RotateCcw,
}

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

function healthConfig(score: number) {
  if (score >= 70) return { label: 'Carteira Saudável',    color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', bar: 'bg-emerald-500', dot: 'bg-emerald-500' }
  if (score >= 45) return { label: 'Atenção Moderada',     color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',   bar: 'bg-amber-500',   dot: 'bg-amber-500'   }
  return              { label: 'Atenção Crítica Necessária', color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     bar: 'bg-red-500',     dot: 'bg-red-500'     }
}

export default function Dashboard() {
  const [report,  setReport]  = useState<PilotReport | null>(null)
  const [recent,  setRecent]  = useState<EvaluationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user } = useAuth()
  const isViewer = user?.role === 'Viewer'
  const isBroker = user?.role === 'Broker'

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
      if (listData.status  === 'fulfilled') setRecent(listData.value.items)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const total = report?.totalEvaluations ?? 0
  const critPct = pct(report?.riskDistribution.critico ?? 0, total)
  const modPct  = pct(report?.riskDistribution.moderado ?? 0, total)
  const adePct  = pct(report?.riskDistribution.adequado ?? 0, total)
  const aumentarPct = pct(report?.actionDistribution.aumentar ?? 0, total)

  const healthScore = total > 0
    ? Math.round(((report!.riskDistribution.adequado * 100) + (report!.riskDistribution.moderado * 50)) / total)
    : 0

  const health = healthConfig(healthScore)

  return (
    <div>
      <TopBar
        title="Dashboard"
        subtitle={isBroker ? 'Suas avaliações' : 'Visão consolidada da carteira'}
        onRefresh={load}
        isLoading={loading}
      />

      <div className="p-6 space-y-5">

        {/* Viewer read-only banner */}
        {isViewer && (
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 animate-fadeIn">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-700">Modo Visualização</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Seu perfil permite apenas consultar dados. Para criar avaliações ou registrar gatilhos, solicite acesso de Corretor ao administrador da corretora.
              </p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-5 animate-fadeIn">
            <div className="skeleton h-28 w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[0,1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="skeleton h-64 rounded-2xl" />
              <div className="skeleton h-64 rounded-2xl" />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !report && (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fadeIn">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
              <Activity className="h-7 w-7 text-brand-500" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Nenhuma avaliação encontrada</p>
            <p className="mt-1 max-w-xs text-xs text-slate-400">
              {isViewer
                ? 'Nenhuma avaliação foi realizada na carteira ainda.'
                : 'Realize a primeira avaliação para que os dados da carteira apareçam aqui.'}
            </p>
            {!isViewer && (
              <button
                onClick={() => navigate('/evaluations/new')}
                className="mt-5 flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all"
              >
                <FilePlus className="h-4 w-4" />
                Nova Avaliação
              </button>
            )}
          </div>
        )}

        {!loading && report && (
          <>
            {/* Portfolio health card */}
            <div className={`rounded-2xl border ${health.border} ${health.bg} p-5 shadow-card animate-fadeIn`}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${health.dot}`} />
                  <span className={`text-sm font-bold ${health.color}`}>{health.label}</span>
                </div>
                <span className={`text-2xl font-extrabold tabular-nums ${health.color}`}>{healthScore}<span className="text-base font-medium opacity-70">/100</span></span>
              </div>

              <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/60">
                {critPct > 0 && (
                  <div className="bg-red-500 transition-all duration-700" style={{ width: `${critPct}%` }} title={`Crítico ${critPct}%`} />
                )}
                {modPct > 0 && (
                  <div className="bg-amber-400 transition-all duration-700" style={{ width: `${modPct}%` }} title={`Moderado ${modPct}%`} />
                )}
                {adePct > 0 && (
                  <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${adePct}%` }} title={`Adequado ${adePct}%`} />
                )}
              </div>

              <div className="mt-2.5 flex items-center gap-4">
                <LegendItem color="bg-red-500"     label="Crítico"   pct={critPct} count={report.riskDistribution.critico} />
                <LegendItem color="bg-amber-400"   label="Moderado"  pct={modPct}  count={report.riskDistribution.moderado} />
                <LegendItem color="bg-emerald-500" label="Adequado"  pct={adePct}  count={report.riskDistribution.adequado} />
              </div>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { icon: Users, iconBg: 'bg-brand-50', iconColor: 'text-brand-600', label: 'Total de Avaliações', value: total.toLocaleString('pt-BR'), sub: `${report.triggerCount} gatilho${report.triggerCount !== 1 ? 's' : ''} registrado${report.triggerCount !== 1 ? 's' : ''}` },
                { icon: AlertTriangle, iconBg: 'bg-red-50', iconColor: 'text-red-500', label: 'Risco Crítico', value: `${critPct}%`, sub: `${report.riskDistribution.critico} cliente${report.riskDistribution.critico !== 1 ? 's' : ''} subprotegido${report.riskDistribution.critico !== 1 ? 's' : ''}`, highlight: critPct > 30 },
                { icon: TrendingUp, iconBg: 'bg-orange-50', iconColor: 'text-orange-500', label: 'Precisam Aumentar', value: `${aumentarPct}%`, sub: `${report.actionDistribution.aumentar} com gap de cobertura`, highlight: aumentarPct > 40 },
                { icon: Zap, iconBg: 'bg-accent-50', iconColor: 'text-accent-600', label: 'Gatilhos de Vida', value: report.triggerCount.toLocaleString('pt-BR'), sub: 'eventos registrados' },
              ].map((card, i) => (
                <DashMetricCard key={card.label} {...card} delay={i * 75} />
              ))}
            </div>

            {/* Distributions */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card animate-fadeIn" style={{ animationDelay: '100ms' }}>
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Perfil de Risco</h2>
                  <span className="text-xs text-slate-400">{total} avaliações</span>
                </div>
                <p className="mb-4 text-xs text-slate-400">
                  Classificação do grau de subproteção de cada cliente.
                </p>
                <div className="space-y-4">
                  <DistBar dot="bg-red-500" label="Crítico" hint="Cobertura muito abaixo do necessário — ação urgente" value={report.riskDistribution.critico} total={total} barColor="bg-red-500" />
                  <DistBar dot="bg-amber-400" label="Moderado" hint="Gap existente — revisão recomendada em breve" value={report.riskDistribution.moderado} total={total} barColor="bg-amber-400" />
                  <DistBar dot="bg-emerald-500" label="Adequado" hint="Cobertura dentro da faixa recomendada pelo motor" value={report.riskDistribution.adequado} total={total} barColor="bg-emerald-500" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card animate-fadeIn" style={{ animationDelay: '150ms' }}>
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Recomendações do Motor</h2>
                  <span className="text-xs text-slate-400">{total} avaliações</span>
                </div>
                <p className="mb-4 text-xs text-slate-400">
                  Ação indicada pelo motor para cada cliente da carteira.
                </p>
                <div className="space-y-4">
                  <DistBar dot="bg-red-400" label="Aumentar" hint="Ampliar cobertura — cliente com gap crítico ou moderado" value={report.actionDistribution.aumentar} total={total} barColor="bg-red-400" />
                  <DistBar dot="bg-emerald-400" label="Manter" hint="Cobertura adequada — nenhuma ação imediata necessária" value={report.actionDistribution.manter} total={total} barColor="bg-emerald-400" />
                  <DistBar dot="bg-amber-400" label="Revisar" hint="Dados desatualizados ou evento recente — agendar revisão" value={report.actionDistribution.revisar} total={total} barColor="bg-amber-400" />
                  <DistBar dot="bg-sky-400" label="Reduzir" hint="Sobressegurado — oportunidade de redimensionamento" value={report.actionDistribution.reduzir} total={total} barColor="bg-sky-400" />
                </div>
              </div>
            </div>

            {/* Priority insight */}
            {aumentarPct >= 20 && (
              <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 animate-fadeIn">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                <div>
                  <p className="text-sm font-semibold text-orange-800">
                    {report.actionDistribution.aumentar} cliente{report.actionDistribution.aumentar !== 1 ? 's precisam' : ' precisa'} aumentar a cobertura ({aumentarPct}% da carteira)
                  </p>
                  <p className="mt-0.5 text-xs text-orange-700">
                    Esses clientes têm gap de proteção identificado. Acesse o Histórico, filtre pela ação "Aumentar" e inicie contato.
                  </p>
                </div>
              </div>
            )}

            {/* Recent evaluations */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden animate-fadeIn" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Avaliações Recentes</h2>
                  <p className="mt-0.5 text-xs text-slate-400">Últimas 5 avaliações processadas pelo motor</p>
                </div>
                <button
                  onClick={() => navigate('/evaluations')}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Ver todas
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {recent.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">
                    Nenhuma avaliação recente.
                  </p>
                ) : (
                  recent.map((ev) => {
                    const ActionIcon = ACTION_ICONS[ev.action]
                    const scoreColor =
                      ev.score >= 70 ? 'bg-emerald-500' :
                      ev.score >= 40 ? 'bg-amber-400'   : 'bg-red-500'

                    return (
                      <button
                        key={ev.id}
                        onClick={() => navigate(`/evaluations/${ev.id}`)}
                        className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-white transition-colors">
                          <ActionIcon className="h-4 w-4 text-slate-500" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs font-medium text-slate-600 truncate">{ev.id.slice(0, 16)}…</p>
                          <p className="text-[11px] text-slate-400">{formatDate(ev.timestamp)}</p>
                        </div>

                        <span className="hidden sm:block shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {ev.channel}
                        </span>

                        <div className="hidden sm:flex shrink-0 flex-col items-end gap-1">
                          <span className="text-xs font-bold text-slate-700 tabular-nums">{ev.score.toFixed(0)}</span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-1.5 rounded-full transition-all ${scoreColor}`}
                              style={{ width: `${Math.max(4, ev.score)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge className={riskColors(ev.risk)} size="sm">
                            {riskLabel(ev.risk)}
                          </Badge>
                          <Badge className={actionColors(ev.action)} size="sm">
                            {actionLabel(ev.action)}
                          </Badge>
                        </div>

                        <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 group-hover:text-slate-500 transition-colors" />
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Quick actions */}
            {!isViewer && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <QuickAction
                  icon={FilePlus}
                  iconBg="bg-brand-600"
                  title="Nova Avaliação"
                  desc="Diagnóstico completo de proteção de vida em 4 passos guiados"
                  onClick={() => navigate('/evaluations/new')}
                />
                <QuickAction
                  icon={Zap}
                  iconBg="bg-accent-600"
                  title="Registrar Gatilho de Vida"
                  desc="Evento de vida que altera a necessidade de proteção de um cliente"
                  onClick={() => navigate('/triggers/new')}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function DashMetricCard({
  icon: Icon, iconBg, iconColor, label, value, sub, highlight = false, delay = 0,
}: {
  icon: React.ElementType
  iconBg: string; iconColor: string
  label: string; value: string | number
  sub?: string; highlight?: boolean; delay?: number
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 animate-fadeIn ${highlight ? 'border-orange-200' : 'border-slate-200'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-500 truncate">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  )
}

function LegendItem({ color, label, pct, count }: { color: string; label: string; pct: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
      <span className="text-xs text-slate-600 font-medium">{label}</span>
      <span className="text-xs text-slate-400 tabular-nums">{pct}%</span>
      <span className="text-xs text-slate-300 tabular-nums">({count})</span>
    </div>
  )
}

function DistBar({
  dot, label, hint, value, total, barColor,
}: {
  dot: string; label: string; hint: string
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
          <span className="text-xs font-bold text-slate-700 tabular-nums">{p}%</span>
          <span className="w-6 text-right text-[11px] text-slate-400 tabular-nums">{value}</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${p}%` }}
        />
      </div>
      <p className="text-[10px] leading-snug text-slate-400 italic">{hint}</p>
    </div>
  )
}

function QuickAction({
  icon: Icon, iconBg, title, desc, onClick,
}: {
  icon: React.ElementType; iconBg: string
  title: string; desc: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-card hover:border-brand-200 hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} shadow-sm group-hover:scale-105 transition-transform`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 group-hover:text-brand-700 transition-colors">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500 leading-snug">{desc}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-300 shrink-0 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
    </button>
  )
}
