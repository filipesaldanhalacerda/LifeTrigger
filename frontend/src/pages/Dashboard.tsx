import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
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
import type { PilotReport, EvaluationSummary } from '../types/api'

const RISK_DOT: Record<string, string> = {
  CRITICO:  'bg-red-500',
  MODERADO: 'bg-amber-500',
  ADEQUADO: 'bg-emerald-500',
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
        getEvaluations(tenantId, { limit: 10 }),
      ])
      if (pilotData.status === 'fulfilled') setReport(pilotData.value)
      if (listData.status  === 'fulfilled') setRecent(listData.value.items)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const pending = report?.totalEvaluations ?? 0
  const totalAll = report?.totalAll ?? pending

  const rawSt = report?.statusDistribution
  const st = rawSt ?? { aberto: pending, convertido: totalAll - pending, parcial: 0, arquivado: 0 }
  const critico = report?.riskDistribution.critico ?? 0
  const aumentar = report?.actionDistribution.aumentar ?? 0
  const triggerCount = report?.triggerCount ?? 0
  const converted = st.convertido + st.parcial
  const conversionRate = totalAll > 0 ? Math.round((converted / totalAll) * 100) : 0
  const noPending = totalAll > 0 && pending === 0

  const healthScore = noPending
    ? 100
    : pending > 0
      ? Math.round(((report!.riskDistribution.adequado * 100) + (report!.riskDistribution.moderado * 50)) / pending)
      : 0
  const health = noPending
    ? { label: 'Protegida', color: 'text-emerald-600', ringStroke: '#059669', dot: 'bg-emerald-500' }
    : healthConfig(healthScore)

  const moderado = report?.riskDistribution.moderado ?? 0
  const adequado = report?.riskDistribution.adequado ?? 0
  const manter = report?.actionDistribution.manter ?? 0
  const reduzir = report?.actionDistribution.reduzir ?? 0
  const revisar = report?.actionDistribution.revisar ?? 0
  const protectedRate = totalAll > 0 ? Math.round(((totalAll - pending) / totalAll) * 100) : 0

  const emailPrefix = user?.email?.split('@')[0] ?? ''
  const userName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)

  return (
    <div>
      <TopBar
        title="Dashboard"
        subtitle={isBroker ? 'Suas avaliações' : 'Visão consolidada da carteira'}
      />

      <div className="p-3 sm:p-4 lg:p-5">

        {/* Viewer banner */}
        {isViewer && (
          <div className="box mb-4 animate-fadeIn">
            <div className="flex items-start gap-3 px-4 py-3">
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Modo Visualização</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Seu perfil permite apenas consultar dados. Para criar avaliações, solicite acesso de Corretor.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[0,1,2,3].map(i => <div key={i} className="skeleton h-[100px] rounded-sm" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[0,1,2].map(i => <div key={i} className="skeleton h-56 rounded-sm" />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !report && (
          <div className="box animate-fadeIn">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-sm bg-brand-50">
                <Activity className="h-6 w-6 text-brand-500" />
              </div>
              <p className="text-sm font-semibold text-slate-800">Nenhuma avaliação encontrada</p>
              <p className="mt-1 max-w-xs text-xs text-slate-400">
                {isViewer
                  ? 'Nenhuma avaliação foi realizada na carteira ainda.'
                  : 'Realize a primeira avaliação para visualizar os dados.'}
              </p>
              {!isViewer && (
                <button
                  onClick={() => navigate('/evaluations/new')}
                  className="mt-4 flex items-center gap-2 rounded-sm bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                >
                  <FilePlus className="h-4 w-4" />
                  Nova Avaliação
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && report && (
          <div className="space-y-4">

            {/* ── Row 1: 4 Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                icon={ShieldAlert}
                iconBg="bg-red-100/80" iconColor="text-red-500"
                label="Risco Crítico"
                value={critico}
                subtitle={pending > 0 ? `de ${pending} pendentes` : 'nenhuma pendente'}
                progress={pending > 0 ? Math.round((critico / pending) * 100) : 0}
                progressColor="bg-red-300"
              />
              <StatCard
                icon={Target}
                iconBg="bg-orange-100/80" iconColor="text-orange-500"
                label="Oportunidades"
                value={aumentar}
                subtitle="precisam aumentar cobertura"
                progress={pending > 0 ? Math.round((aumentar / pending) * 100) : 0}
                progressColor="bg-orange-300"
              />
              <StatCard
                icon={ShieldCheck}
                iconBg="bg-emerald-100/80" iconColor="text-emerald-500"
                label="Conversão"
                value={`${conversionRate}%`}
                subtitle={`${converted} de ${totalAll} convertidas`}
                progress={conversionRate}
                progressColor="bg-emerald-300"
              />
              <StatCard
                icon={Zap}
                iconBg="bg-accent-100/80" iconColor="text-accent-600"
                label="Gatilhos"
                value={triggerCount}
                subtitle={`${totalAll} avaliações processadas`}
                progress={totalAll > 0 ? Math.min(Math.round((triggerCount / totalAll) * 100), 100) : 0}
                progressColor="bg-brand-300"
              />
            </div>

            {/* ── Row 2: Health + Risk Distribution + Atividade Recente ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

              {/* Health / Greeting */}
              <div className="box">
                <div className="box-header">
                  <span className="box-header-title">Saúde da Carteira</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{totalAll} {totalAll === 1 ? 'avaliação' : 'avaliações'}</span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative h-14 w-14 shrink-0">
                      <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" stroke="#f1f5f9" />
                        <circle
                          cx="18" cy="18" r="15" fill="none" strokeWidth="3"
                          pathLength={100}
                          strokeDasharray={`${healthScore} 100`}
                          strokeLinecap="round"
                          stroke={health.ringStroke}
                          style={{ transition: 'stroke-dasharray 1s ease' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-lg font-extrabold tabular-nums ${health.color}`}>{healthScore}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] text-slate-500">
                        {greeting()}, <span className="font-semibold text-slate-800">{userName}</span>
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${health.dot}`} />
                        <span className={`text-[13px] font-bold ${health.color}`}>{health.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {noPending ? 'Todas resolvidas' : `${pending} pendente${pending !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>

                  {/* Stacked status bar */}
                  {totalAll > 0 && (
                    <div className="mb-3">
                      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                        {st.convertido > 0 && <div className="bg-emerald-300 transition-all duration-700" style={{ width: `${pct(st.convertido, totalAll)}%` }} />}
                        {st.parcial > 0 && <div className="bg-amber-300 transition-all duration-700" style={{ width: `${pct(st.parcial, totalAll)}%` }} />}
                        {st.aberto > 0 && <div className="bg-brand-300 transition-all duration-700" style={{ width: `${pct(st.aberto, totalAll)}%` }} />}
                        {st.arquivado > 0 && <div className="bg-slate-300 transition-all duration-700" style={{ width: `${pct(st.arquivado, totalAll)}%` }} />}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <StatusRow label="Convertidas" count={st.convertido} total={totalAll} color="bg-emerald-500" />
                    <StatusRow label="Parciais" count={st.parcial} total={totalAll} color="bg-amber-400" />
                    <StatusRow label="Abertas" count={st.aberto} total={totalAll} color="bg-brand-500" />
                    <StatusRow label="Arquivadas" count={st.arquivado} total={totalAll} color="bg-slate-400" />
                  </div>

                  {/* Protection rate footer */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">Taxa de proteção</span>
                    <span className={`text-[13px] font-bold tabular-nums ${protectedRate >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>{protectedRate}%</span>
                  </div>
                </div>
              </div>

              {/* Distribution card */}
              <div className="box">
                <div className="box-header">
                  <span className="box-header-title">Distribuição de Risco</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{pending} pendentes</span>
                </div>
                <div className="px-4 py-3">
                  {pending === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <ShieldCheck className="h-8 w-8 text-emerald-300 mb-2" />
                      <p className="text-sm font-semibold text-slate-600">Sem pendências</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Todas as avaliações foram resolvidas</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <RiskBar label="Crítico" count={critico} total={pending} color="bg-red-300" textColor="text-red-500" />
                        <RiskBar label="Moderado" count={moderado} total={pending} color="bg-amber-300" textColor="text-amber-500" />
                        <RiskBar label="Adequado" count={adequado} total={pending} color="bg-emerald-300" textColor="text-emerald-500" />
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-accent-600" />
                          <span className="text-[12px] text-slate-500">Gatilhos</span>
                          <span className="text-[13px] font-bold text-slate-800 tabular-nums ml-auto">{triggerCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-orange-500" />
                          <span className="text-[12px] text-slate-500">Ação</span>
                          <span className="text-[13px] font-bold text-slate-800 tabular-nums ml-auto">{aumentar}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="box md:col-span-2 lg:col-span-1">
                <div className="box-header">
                  <span className="box-header-title">Atividade Recente</span>
                  <button onClick={() => navigate('/clients')} className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                    Ver Todas
                  </button>
                </div>

                {/* Risk summary mini-pills */}
                {recent.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                    {(() => {
                      const rc = recent.reduce((acc, ev) => { acc[ev.risk] = (acc[ev.risk] || 0) + 1; return acc }, {} as Record<string, number>)
                      return Object.entries(rc).map(([risk, count]) => (
                        <span key={risk} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${riskColors(risk as import('../types/api').RiskClassification)}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${RISK_DOT[risk] ?? 'bg-slate-400'}`} />
                          {count}
                        </span>
                      ))
                    })()}
                    <span className="text-[10px] text-slate-400 ml-auto">{recent.length} últimas</span>
                  </div>
                )}

                <div className="px-3 py-2 max-h-[280px] overflow-y-auto">
                  {recent.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Clock className="h-7 w-7 text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-500">Nenhuma atividade</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">As avaliações aparecerão aqui</p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {recent.map((ev, idx) => {
                        const dotColor = RISK_DOT[ev.risk] ?? 'bg-slate-400'
                        const isLast = idx === recent.length - 1
                        return (
                          <button
                            key={ev.id}
                            onClick={() => navigate(`/evaluations/${ev.id}`)}
                            className="group flex gap-2.5 w-full text-left py-2 hover:bg-slate-50/50 px-1 rounded-sm transition-colors"
                          >
                            <div className="flex flex-col items-center pt-1.5">
                              <div className={`h-2 w-2 rounded-full shrink-0 ${dotColor} ring-2 ring-white`} />
                              {!isLast && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                            </div>
                            <div className="flex-1 min-w-0 pb-0.5">
                              <div className="flex items-center gap-1 flex-wrap">
                                <Badge className={riskColors(ev.risk)} size="sm">{riskLabel(ev.risk)}</Badge>
                                <Badge className={actionColors(ev.action)} size="sm">{actionLabel(ev.action)}</Badge>
                              </div>
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                Score <span className="font-semibold text-slate-600">{ev.score.toFixed(0)}</span> pts
                              </p>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 pt-0.5 tabular-nums">
                              {formatDate(ev.timestamp).split(',')[1]?.trim() || formatDate(ev.timestamp)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Row 3: Quick Actions + Resumo por Ação ── */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
              {!isViewer && (
                <div className="sm:col-span-4 box">
                  <div className="box-header">
                    <span className="box-header-title">Ações Rápidas</span>
                  </div>
                  <div className="p-2 space-y-0.5">
                    <ActionBtn icon={FilePlus} iconBg="bg-brand-600" label="Nova Avaliação" desc="Diagnóstico completo" onClick={() => navigate('/evaluations/new')} />
                    <ActionBtn icon={Clock} iconBg="bg-accent-600" label="Meus Clientes" desc={`${totalAll} avaliações`} onClick={() => navigate('/clients')} />
                    <ActionBtn icon={BarChart2} iconBg="bg-emerald-600" label="Relatórios" desc="Análise da carteira" onClick={() => navigate('/reports')} />
                  </div>
                  {/* Mini stats footer */}
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Pendentes</span>
                      <span className="text-[11px] font-bold text-slate-600 tabular-nums">{pending}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-slate-400">Resolvidas</span>
                      <span className="text-[11px] font-bold text-emerald-600 tabular-nums">{totalAll - pending}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className={`box ${!isViewer ? 'sm:col-span-8' : 'sm:col-span-12'}`}>
                <div className="box-header">
                  <span className="box-header-title">Resumo por Ação</span>
                  <button onClick={() => navigate('/reports')} className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                    Ver Todos
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full table-synto">
                    <thead>
                      <tr>
                        <th className="text-left">Ação</th>
                        <th className="text-center">Qtd</th>
                        <th className="text-center">%</th>
                        <th className="text-left">Progresso</th>
                      </tr>
                    </thead>
                    <tbody>
                      <ActionRow label="Aumentar" count={aumentar} total={pending} color="bg-red-300" />
                      <ActionRow label="Manter" count={manter} total={pending} color="bg-emerald-300" />
                      <ActionRow label="Reduzir" count={reduzir} total={pending} color="bg-blue-300" />
                      <ActionRow label="Revisar" count={revisar} total={pending} color="bg-amber-300" />
                    </tbody>
                  </table>
                </div>
                {/* Table summary footer */}
                <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <span className="text-[11px] text-slate-400">Total de pendentes</span>
                  <span className="text-[13px] font-bold text-slate-700 tabular-nums">{pending}</span>
                </div>
              </div>
            </div>

            {/* Alert banner */}
            {critico > 0 && (
              <div className="box border-l-4 border-l-red-300 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                  <div className="flex items-start gap-2.5 flex-1">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                    <div>
                      <p className="text-[13px] font-semibold text-red-800">
                        {critico} cliente{critico !== 1 ? 's' : ''} com risco crítico
                      </p>
                      <p className="text-xs text-red-600/80">
                        Cobertura muito abaixo do necessário. Priorize o contato.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/clients')}
                    className="shrink-0 flex items-center gap-1.5 rounded-sm bg-red-400 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
                  >
                    Ver clientes <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function StatCard({
  icon: Icon, iconBg, iconColor, label, value, subtitle, progress = 0, progressColor = 'bg-brand-500',
}: {
  icon: React.ElementType
  iconBg: string; iconColor: string
  label: string; value: number | string
  subtitle?: string
  progress?: number; progressColor?: string
}) {
  const display = typeof value === 'number' ? value.toLocaleString('pt-BR') : value
  return (
    <div className="box animate-fadeIn">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-1">
          <p className="text-[12px] font-medium text-slate-500 leading-tight">{label}</p>
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>
        <p className="mt-1 text-[1.5rem] font-extrabold text-slate-900 tabular-nums leading-none">{display}</p>
        {subtitle && <p className="mt-1 text-[10px] text-slate-400 leading-tight">{subtitle}</p>}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-[4px] rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${progressColor} transition-all duration-700`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-slate-400 tabular-nums">{progress}%</span>
        </div>
      </div>
    </div>
  )
}

function StatusRow({ label, count, total, color }: {
  label: string; count: number; total: number; color: string
}) {
  const p = pct(count, total)
  return (
    <div className="flex items-center gap-2.5">
      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${color}`} />
      <span className="text-[13px] text-slate-600 flex-1">{label}</span>
      <span className="text-[13px] font-bold text-slate-800 tabular-nums">{count}</span>
      <span className="text-[11px] text-slate-400 tabular-nums w-8 text-right">{p}%</span>
    </div>
  )
}

function RiskBar({ label, count, total, color, textColor }: {
  label: string; count: number; total: number; color: string; textColor: string
}) {
  const p = pct(count, total)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] font-medium text-slate-600">{label}</span>
        <span className={`text-[13px] font-bold tabular-nums ${textColor}`}>{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  )
}

function ActionBtn({ icon: Icon, iconBg, label, desc, onClick }: {
  icon: React.ElementType; iconBg: string; label: string; desc: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left hover:bg-slate-50 transition-colors"
    >
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm ${iconBg} text-white`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-700 group-hover:text-slate-900 leading-tight">{label}</p>
        <p className="text-[10px] text-slate-400 leading-tight">{desc}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
    </button>
  )
}

function ActionRow({ label, count, total, color }: {
  label: string; count: number; total: number; color: string
}) {
  const p = pct(count, total)
  return (
    <tr>
      <td>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${color}`} />
          <span className="font-medium">{label}</span>
        </div>
      </td>
      <td className="text-center font-semibold tabular-nums">{count}</td>
      <td className="text-center tabular-nums">{p}%</td>
      <td>
        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${p}%` }} />
        </div>
      </td>
    </tr>
  )
}
