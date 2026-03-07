import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Minus, RotateCcw,
  AlertTriangle, ShieldAlert, ShieldCheck, Target,
  ChevronRight, Activity, EyeOff, FilePlus, Zap,
  BarChart2, Clock, ArrowUpRight,
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

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function healthConfig(score: number) {
  if (score >= 70) return { label: 'Saudável',   color: 'text-emerald-600', ringStroke: '#059669', dot: 'bg-emerald-500' }
  if (score >= 45) return { label: 'Moderada',   color: 'text-amber-600',   ringStroke: '#d97706', dot: 'bg-amber-500'   }
  return                   { label: 'Crítica',    color: 'text-red-600',     ringStroke: '#dc2626', dot: 'bg-red-500'     }
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
        getEvaluations(tenantId, { limit: 8 }),
      ])
      if (pilotData.status === 'fulfilled') setReport(pilotData.value)
      if (listData.status  === 'fulfilled') setRecent(listData.value.items)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const total = report?.totalEvaluations ?? 0
  const critico = report?.riskDistribution.critico ?? 0
  const adequado = report?.riskDistribution.adequado ?? 0
  const aumentar = report?.actionDistribution.aumentar ?? 0
  const triggerCount = report?.triggerCount ?? 0

  // totalAll includes all evaluations regardless of status; total only counts active ones
  const totalAll = report?.totalAll ?? total
  const allConverted = totalAll > 0 && total === 0

  const healthScore = allConverted
    ? 100
    : total > 0
      ? Math.round(((report!.riskDistribution.adequado * 100) + (report!.riskDistribution.moderado * 50)) / total)
      : 0
  const health = allConverted
    ? { label: 'Protegida', color: 'text-emerald-600', ringStroke: '#059669', dot: 'bg-emerald-500' }
    : healthConfig(healthScore)

  const emailPrefix = user?.email?.split('@')[0] ?? ''
  const userName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)

  return (
    <div>
      <TopBar
        title="Dashboard"
        subtitle={isBroker ? 'Suas avaliações' : 'Visão consolidada da carteira'}
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">

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
            <div className="skeleton h-20 w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {[0,1,2,3].map(i => <div key={i} className="skeleton h-20 sm:h-24 rounded-2xl" />)}
            </div>
            <div className="skeleton h-72 w-full rounded-2xl" />
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
            {/* ── Greeting + Health Score ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-card animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Left: greeting + portfolio bar */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-500">
                    {greeting()}, <span className="font-semibold text-slate-800">{userName}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {allConverted ? totalAll : total} avaliações na carteira
                    {allConverted && ' — todas convertidas'}
                  </p>

                  {/* Stacked bar */}
                  {allConverted ? (
                    <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-emerald-500 transition-all duration-700" />
                  ) : (
                    <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      {pct(critico, total) > 0 && (
                        <div className="bg-red-500 transition-all duration-700" style={{ width: `${pct(critico, total)}%` }} />
                      )}
                      {pct(report.riskDistribution.moderado, total) > 0 && (
                        <div className="bg-amber-400 transition-all duration-700" style={{ width: `${pct(report.riskDistribution.moderado, total)}%` }} />
                      )}
                      {pct(adequado, total) > 0 && (
                        <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${pct(adequado, total)}%` }} />
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 sm:gap-4">
                    {allConverted ? (
                      <LegendDot color="bg-emerald-500" label="Convertidas" count={totalAll} />
                    ) : (
                      <>
                        <LegendDot color="bg-red-500" label="Crítico" count={critico} />
                        <LegendDot color="bg-amber-400" label="Moderado" count={report.riskDistribution.moderado} />
                        <LegendDot color="bg-emerald-500" label="Adequado" count={adequado} />
                      </>
                    )}
                  </div>
                </div>

                {/* Right: health ring */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative h-14 w-14">
                    <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="text-slate-100" stroke="currentColor" />
                      <circle
                        cx="18" cy="18" r="15.5" fill="none" strokeWidth="3"
                        strokeDasharray={`${healthScore * 0.975} 100`}
                        strokeLinecap="round"
                        stroke={health.ringStroke}
                        style={{ transition: 'stroke-dasharray 1s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-base font-extrabold tabular-nums ${health.color}`}>{healthScore}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Saúde</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${health.dot}`} />
                      <span className={`text-xs font-semibold ${health.color}`}>{health.label}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Indicator cards — different from Reports ── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <IndicatorCard
                icon={ShieldAlert}
                iconBg="bg-red-50" iconColor="text-red-500"
                label="Clientes em Risco"
                value={critico}
                sub={critico > 0 ? 'precisam de ação urgente' : 'nenhum cliente crítico'}
                alert={critico > 0}
                delay={0}
              />
              <IndicatorCard
                icon={Target}
                iconBg="bg-orange-50" iconColor="text-orange-500"
                label="Oportunidades de Venda"
                value={aumentar}
                sub={aumentar > 0 ? 'clientes com gap de cobertura' : 'sem oportunidades pendentes'}
                alert={aumentar > 3}
                delay={75}
              />
              <IndicatorCard
                icon={ShieldCheck}
                iconBg="bg-emerald-50" iconColor="text-emerald-500"
                label="Clientes Protegidos"
                value={adequado}
                sub={`${pct(adequado, total)}% da carteira adequada`}
                delay={150}
              />
              <IndicatorCard
                icon={Zap}
                iconBg="bg-accent-50" iconColor="text-accent-600"
                label="Gatilhos de Vida"
                value={triggerCount}
                sub="eventos registrados"
                delay={225}
              />
            </div>

            {/* ── Priority alerts ── */}
            {critico > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 animate-fadeIn">
                <div className="flex items-start gap-3 flex-1">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      {critico} cliente{critico !== 1 ? 's' : ''} com risco crítico
                    </p>
                    <p className="mt-0.5 text-xs text-red-700">
                      {critico !== 1 ? 'Esses clientes estão' : 'Esse cliente está'} com cobertura muito abaixo do necessário. Priorize o contato para revisão de proteção.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/evaluations')}
                  className="shrink-0 flex items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Ver histórico
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {aumentar >= 3 && critico === 0 && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 animate-fadeIn">
                <div className="flex items-start gap-3 flex-1">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  <div>
                    <p className="text-sm font-semibold text-orange-800">
                      {aumentar} oportunidade{aumentar !== 1 ? 's' : ''} de venda identificada{aumentar !== 1 ? 's' : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-orange-700">
                      O motor detectou clientes com gap de cobertura. Acesse o relatório para detalhes por corretor.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/reports')}
                  className="shrink-0 flex items-center justify-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition-colors"
                >
                  Relatórios
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* ── Two-column: Recent + Actions ── */}
            <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">

              {/* Recent evaluations (2/3 width) */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden animate-fadeIn" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-5 py-3 sm:py-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Atividade Recente</h2>
                      <p className="text-[11px] text-slate-400">Últimas avaliações processadas</p>
                    </div>
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
                    <p className="py-10 text-center text-sm text-slate-400">Nenhuma avaliação recente.</p>
                  ) : (
                    recent.map((ev) => {
                      const ActionIcon = ACTION_ICONS[ev.action]
                      const scoreColor =
                        ev.score >= 70 ? 'text-emerald-600' :
                        ev.score >= 40 ? 'text-amber-600'   : 'text-red-600'

                      return (
                        <button
                          key={ev.id}
                          onClick={() => navigate(`/evaluations/${ev.id}`)}
                          className="flex w-full items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 text-left hover:bg-slate-50 transition-colors group"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-white transition-colors">
                            <ActionIcon className="h-3.5 w-3.5 text-slate-500" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge className={riskColors(ev.risk)} size="sm">{riskLabel(ev.risk)}</Badge>
                              <Badge className={actionColors(ev.action)} size="sm">{actionLabel(ev.action)}</Badge>
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-400">{formatDate(ev.timestamp)}</p>
                          </div>

                          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                            <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>{ev.score.toFixed(0)}</span>
                            <span className="text-[10px] text-slate-400">pts</span>
                          </div>

                          <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 group-hover:text-slate-500 transition-colors" />
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Right sidebar: Quick Actions + Links */}
              <div className="space-y-4 animate-fadeIn" style={{ animationDelay: '150ms' }}>
                {/* Quick actions */}
                {!isViewer && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Ações Rápidas</p>
                    <button
                      onClick={() => navigate('/evaluations/new')}
                      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-brand-200 hover:bg-brand-50 transition-all"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 shadow-sm group-hover:scale-105 transition-transform">
                        <FilePlus className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-brand-700 transition-colors">Nova Avaliação</p>
                        <p className="text-[11px] text-slate-400">Diagnóstico completo em 4 passos</p>
                      </div>
                    </button>
                    <button
                      onClick={() => navigate('/evaluations')}
                      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-accent-200 hover:bg-accent-50 transition-all"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-600 shadow-sm group-hover:scale-105 transition-transform">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-accent-700 transition-colors">Ver Histórico</p>
                        <p className="text-[11px] text-slate-400">Avaliações e gatilhos registrados</p>
                      </div>
                    </button>
                  </div>
                )}

                {/* Navigation shortcuts */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Navegação</p>
                  <NavLink icon={BarChart2} label="Relatórios" desc="Análise detalhada por período" onClick={() => navigate('/reports')} />
                  <NavLink icon={Clock} label="Histórico" desc="Todas as avaliações da carteira" onClick={() => navigate('/evaluations')} />
                  {!isBroker && !isViewer && (
                    <NavLink icon={Target} label="Clientes" desc="Visão por cliente e ConsentID" onClick={() => navigate('/clients')} />
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function LegendDot({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className="text-xs text-slate-400 tabular-nums">({count})</span>
    </div>
  )
}

function IndicatorCard({
  icon: Icon, iconBg, iconColor, label, value, sub, alert = false, delay = 0,
}: {
  icon: React.ElementType
  iconBg: string; iconColor: string
  label: string; value: number
  sub?: string; alert?: boolean; delay?: number
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-3 sm:p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 animate-fadeIn ${alert ? 'border-orange-200' : 'border-slate-200'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 sm:mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">{value.toLocaleString('pt-BR')}</p>
          {sub && <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">{sub}</p>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
    </div>
  )
}

function NavLink({ icon: Icon, label, desc, onClick }: {
  icon: React.ElementType; label: string; desc: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50 transition-colors"
    >
      <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-500 transition-colors" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <p className="text-[10px] text-slate-400">{desc}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0 group-hover:text-slate-500 transition-colors" />
    </button>
  )
}
