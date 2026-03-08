import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Filter, TrendingUp, TrendingDown, Minus, RotateCcw,
  AlertCircle, ChevronRight, RefreshCw, Users, Zap,
  ShieldAlert, ShieldCheck, ShieldQuestion, Copy, Check, CheckCircle,
  CircleDot, Archive, BadgeCheck, ChevronDown, PieChart,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Badge } from '../components/ui/Badge'
import { StatusChangeModal } from '../components/evaluation/StatusChangeModal'
import { actionColors, actionLabel, riskColors, riskLabel, formatDate, formatCurrency, riskScoreColor, evalStatusLabel, evalStatusColors } from '../lib/utils'
import { getEvaluations, getUsers, getActiveTenantId } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import type { EvaluationSummary, RecommendedAction, EvaluationStatusType, UserRecord } from '../types/api'

const ACTION_ICONS: Record<RecommendedAction, React.ElementType> = {
  AUMENTAR: TrendingUp,
  MANTER: Minus,
  REDUZIR: TrendingDown,
  REVISAR: RotateCcw,
}

// ── Mini score bar ────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const fill = score < 30 ? 'bg-red-500' : score < 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full transition-all ${fill}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${riskScoreColor(score)}`}>{score.toFixed(0)}</span>
    </div>
  )
}

// ── Clickable summary card ─────────────────────────────────────────
interface SummaryCardProps {
  label: string
  value: number
  icon: React.ElementType
  iconBg: string
  iconColor: string
  hint: string
  active?: boolean
  onClick?: () => void
}
function SummaryCard({ label, value, icon: Icon, iconBg, iconColor, hint, active, onClick }: SummaryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left shadow-card transition-all ${
        active
          ? 'border-brand-300 bg-brand-50 ring-2 ring-brand-100'
          : onClick
            ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer'
            : 'border-slate-200 bg-white cursor-default'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        {active && (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-600">
            Filtrado
          </span>
        )}
      </div>
      <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function EvaluationHistory() {
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const isManagerPlus = hasRole('Manager')

  const [items, setItems]               = useState<EvaluationSummary[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [search, setSearch]             = useState('')
  const [filterAction, setFilterAction] = useState<string>('')
  const [filterRisk, setFilterRisk]     = useState<string>('')
  const [filterUser, setFilterUser]     = useState<string>('')
  const [filterType, setFilterType]     = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [copiedId, copyId]              = useCopyToClipboard()
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null)
  const [statusMenuPos, setStatusMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: EvaluationStatusType } | null>(null)
  const [users, setUsers]               = useState<UserRecord[]>([])

  // Close status menu on outside click
  const closeMenu = useCallback(() => { setStatusMenuId(null); setStatusMenuPos(null) }, [])
  useEffect(() => {
    if (statusMenuId) {
      document.addEventListener('click', closeMenu)
      return () => document.removeEventListener('click', closeMenu)
    }
  }, [statusMenuId, closeMenu])

  function load() {
    setLoading(true)
    setError(null)
    getEvaluations(getActiveTenantId(), { limit: 200 } /* max fetch for client-side grouping */)
      .then((res) => setItems(res.items))
      .catch(() => setError('Não foi possível carregar o histórico. Verifique a conexão e tente novamente.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (isManagerPlus) {
      getUsers().then(setUsers).catch(() => { /* best-effort */ })
    }
  }, [isManagerPlus])

  function clearFilters() {
    setSearch('')
    setFilterAction('')
    setFilterRisk('')
    setFilterUser('')
    setFilterType('')
    setFilterStatus('')
  }

  function requestStatusChange(e: React.MouseEvent, id: string, newStatus: EvaluationStatusType) {
    e.stopPropagation()
    setStatusMenuId(null)
    setConfirmAction({ id, status: newStatus })
  }

  function handleStatusConfirmed(finalStatus: EvaluationStatusType, statusNotes?: string) {
    if (!confirmAction) return
    setItems((prev) => prev.map((ev) => ev.id === confirmAction.id ? { ...ev, status: finalStatus, statusNotes } : ev))
    setConfirmAction(null)
  }

  const filtered = items.filter((ev) => {
    const q = search.toLowerCase()
    if (q && !ev.id.toLowerCase().includes(q) && !ev.channel.toLowerCase().includes(q)) return false
    if (filterAction && ev.action !== filterAction) return false
    if (filterRisk && ev.risk !== filterRisk) return false
    if (filterUser && ev.createdByUserId !== filterUser) return false
    if (filterType === 'trigger' && !ev.isTrigger) return false
    if (filterType === 'evaluation' && ev.isTrigger) return false
    if (filterStatus && (ev.status || 'ABERTO') !== filterStatus) return false
    return true
  })

  const pendingItems = items.filter((e) => (e.status || 'ABERTO') === 'ABERTO')
  const statusCounts = {
    aberto:     items.filter((e) => (e.status || 'ABERTO') === 'ABERTO').length,
    convertido: items.filter((e) => e.status === 'CONVERTIDO').length,
    parcial:    items.filter((e) => e.status === 'CONVERTIDO_PARCIAL').length,
    arquivado:  items.filter((e) => e.status === 'ARQUIVADO').length,
  }
  const riskCounts = {
    critico:  pendingItems.filter((e) => e.risk === 'CRITICO').length,
    moderado: pendingItems.filter((e) => e.risk === 'MODERADO').length,
    adequado: pendingItems.filter((e) => e.risk === 'ADEQUADO').length,
  }

  const hasActiveFilters = !!(search || filterAction || filterRisk || filterUser || filterType || filterStatus)

  // Group filtered items by consentId for visual threading
  const grouped = (() => {
    const map = new Map<string, typeof filtered>()
    for (const ev of filtered) {
      const key = ev.consentId || ev.id // fallback to own id if no consentId
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    // Sort each group: non-triggers first, then by timestamp desc
    for (const [, group] of map) {
      group.sort((a, b) => {
        if (a.isTrigger !== b.isTrigger) return a.isTrigger ? 1 : -1
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      })
    }
    // Return groups ordered by earliest timestamp
    return [...map.values()].sort((a, b) =>
      new Date(b[0].timestamp).getTime() - new Date(a[0].timestamp).getTime()
    )
  })()

  // Helper: email curto do corretor por userId
  function brokerLabel(userId?: string): string {
    if (!userId) return '—'
    const u = users.find((u) => u.id === userId)
    return u ? u.email.split('@')[0] : userId.slice(0, 8) + '…'
  }

  return (
    <div>
      <TopBar
        title="Histórico de Avaliações"
        subtitle={loading ? 'Carregando…' : `${filtered.length} de ${items.length} registros`}
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-fadeIn">

        {/* Summary cards */}
        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard
              label="Pendentes"
              value={statusCounts.aberto}
              icon={Users}
              iconBg="bg-slate-100"
              iconColor="text-slate-600"
              hint={`${statusCounts.convertido + statusCounts.parcial} convertida${(statusCounts.convertido + statusCounts.parcial) !== 1 ? 's' : ''} · ${statusCounts.arquivado} arquivada${statusCounts.arquivado !== 1 ? 's' : ''}`}
            />
            <SummaryCard
              label="Risco Crítico"
              value={riskCounts.critico}
              icon={ShieldAlert}
              iconBg="bg-red-50"
              iconColor="text-red-600"
              hint="exigem atenção imediata"
              active={filterRisk === 'CRITICO'}
              onClick={() => setFilterRisk(filterRisk === 'CRITICO' ? '' : 'CRITICO')}
            />
            <SummaryCard
              label="Risco Moderado"
              value={riskCounts.moderado}
              icon={ShieldQuestion}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              hint="monitorar regularmente"
              active={filterRisk === 'MODERADO'}
              onClick={() => setFilterRisk(filterRisk === 'MODERADO' ? '' : 'MODERADO')}
            />
            <SummaryCard
              label="Risco Adequado"
              value={riskCounts.adequado}
              icon={ShieldCheck}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              hint="cobertura satisfatória"
              active={filterRisk === 'ADEQUADO'}
              onClick={() => setFilterRisk(filterRisk === 'ADEQUADO' ? '' : 'ADEQUADO')}
            />
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ID ou canal…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-card focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className={`h-4 w-4 ${hasActiveFilters ? 'text-brand-500' : 'text-slate-400'}`} />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-card focus:border-brand-400 focus:outline-none"
            >
              <option value="">Todas as ações</option>
              <option value="AUMENTAR">Aumentar cobertura</option>
              <option value="MANTER">Manter cobertura</option>
              <option value="REDUZIR">Reduzir cobertura</option>
              <option value="REVISAR">Revisar situação</option>
            </select>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-card focus:border-brand-400 focus:outline-none"
            >
              <option value="">Todos os riscos</option>
              <option value="CRITICO">Risco Crítico</option>
              <option value="MODERADO">Risco Moderado</option>
              <option value="ADEQUADO">Risco Adequado</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-card focus:border-brand-400 focus:outline-none"
            >
              <option value="">Avaliações e Gatilhos</option>
              <option value="evaluation">Apenas Avaliações</option>
              <option value="trigger">Apenas Gatilhos</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-card focus:border-brand-400 focus:outline-none"
            >
              <option value="">Todos os status</option>
              <option value="ABERTO">Abertos</option>
              <option value="CONVERTIDO">Convertidos</option>
              <option value="CONVERTIDO_PARCIAL">Parciais</option>
              <option value="ARQUIVADO">Arquivados</option>
            </select>
            {isManagerPlus && users.length > 0 && (
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-card focus:border-brand-400 focus:outline-none"
              >
                <option value="">Todos os corretores</option>
                {users.filter((u) => u.role === 'Broker').map((u) => (
                  <option key={u.id} value={u.id}>{u.email.split('@')[0]}</option>
                ))}
              </select>
            )}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-card hover:text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="sm:ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-card hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Loading — skeleton rows */}
        {loading && (
          <div className="space-y-2">
            <div className="skeleton h-14 w-full rounded-xl" />
            <div className="skeleton h-14 w-full rounded-xl" />
            <div className="skeleton h-14 w-full rounded-xl" />
            <div className="skeleton h-14 w-full rounded-xl" />
            <div className="skeleton h-14 w-full rounded-xl" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Não foi possível carregar</p>
              <p className="mt-0.5 text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">

            {/* Table hint */}
            {filtered.length > 0 && (
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
                <p className="text-[11px] text-slate-500">
                  <span className="font-semibold tabular-nums text-slate-700">{filtered.length}</span>{' '}
                  {filtered.length === 1 ? 'registro' : 'registros'}
                  {(() => {
                    const triggers = filtered.filter((e) => e.isTrigger).length
                    const evals = filtered.length - triggers
                    if (triggers > 0 && evals > 0) return ` (${evals} ${evals === 1 ? 'avaliação' : 'avaliações'}, ${triggers} ${triggers === 1 ? 'gatilho' : 'gatilhos'})`
                    if (triggers > 0) return ` (${triggers} ${triggers === 1 ? 'gatilho' : 'gatilhos'})`
                    return ` (${evals} ${evals === 1 ? 'avaliação' : 'avaliações'})`
                  })()}
                  {' '}— clique em uma linha para ver o resultado completo.
                </p>
              </div>
            )}

            {/* Mobile card list */}
            <div className="sm:hidden">
              {grouped.map((group, gIdx) => {
                const hasChildren = group.length > 1
                return (
                  <div key={group[0].id} className={gIdx > 0 ? 'border-t-2 border-slate-100' : ''}>
                    {group.map((ev, idx) => {
                      const ActionIcon = ACTION_ICONS[ev.action]
                      const iconBg = ev.risk === 'CRITICO' ? 'bg-red-50' : ev.risk === 'MODERADO' ? 'bg-amber-50' : 'bg-emerald-50'
                      const iconColor = ev.risk === 'CRITICO' ? 'text-red-500' : ev.risk === 'MODERADO' ? 'text-amber-500' : 'text-emerald-500'
                      const isChild = idx > 0 && ev.isTrigger
                      const isLastChild = isChild && idx === group.length - 1
                      return (
                        <div
                          key={ev.id}
                          onClick={() => navigate(`/evaluations/${ev.id}`)}
                          className={`relative cursor-pointer active:bg-slate-50 ${isChild ? 'bg-amber-50/20' : ''} ${idx > 0 ? 'border-t border-slate-100' : ''}`}
                        >
                          {/* Vertical connector line for groups */}
                          {isChild && (
                            <div className="absolute left-6 top-0 w-px bg-amber-300" style={{ bottom: isLastChild ? '50%' : 0 }} />
                          )}
                          {hasChildren && idx === 0 && group.some(e => e.isTrigger) && (
                            <div className="absolute left-6 bottom-0 w-px bg-amber-300" style={{ top: '50%' }} />
                          )}
                          <div className={`flex items-start gap-3 py-3 ${isChild ? 'pl-10 pr-4' : 'px-4'}`}>
                            {/* Horizontal connector for children */}
                            {isChild && (
                              <div className="absolute left-6 top-1/2 w-4 h-px bg-amber-300" />
                            )}
                            <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5 ${ev.isTrigger ? 'bg-amber-100 ring-2 ring-amber-200' : iconBg}`}>
                              {ev.isTrigger
                                ? <Zap className="h-4 w-4 text-amber-600" />
                                : <ActionIcon className={`h-4 w-4 ${iconColor}`} />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium text-slate-700 truncate">{formatDate(ev.timestamp)}</p>
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {ev.isTrigger && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                    <Zap className="h-2.5 w-2.5" />Gatilho
                                  </span>
                                )}
                                {!ev.isTrigger && hasChildren && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                                    Avaliação Original
                                  </span>
                                )}
                                <Badge className={riskColors(ev.risk)} size="sm">{riskLabel(ev.risk)}</Badge>
                                <Badge className={actionColors(ev.action)} size="sm">{actionLabel(ev.action)}</Badge>
                              </div>
                              <div className="mt-1.5 flex items-center gap-3">
                                <ScoreBar score={ev.score} />
                                <span className={`text-[11px] font-semibold tabular-nums ${ev.gapPct > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {ev.gapPct === 0 ? 'Alinhado' : `Gap ${ev.gapPct > 0 ? '+' : ''}${ev.gapPct.toFixed(1)}%`}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{ev.channel}</span>
                                <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${evalStatusColors((ev.status || 'ABERTO') as EvaluationStatusType)}`}>
                                  {evalStatusLabel((ev.status || 'ABERTO') as EvaluationStatusType)}
                                </span>
                                {isManagerPlus && <span>{brokerLabel(ev.createdByUserId)}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Avaliação
                    <span className="ml-1 font-normal normal-case text-slate-400">ID + data</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Classificação
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ação
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Protection Score
                    <span className="ml-1 font-normal normal-case text-slate-400">0–100</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Gap de Cobertura
                    <span className="ml-1 font-normal normal-case text-slate-400">déficit/excedente</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Canal
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  {isManagerPlus && (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Corretor
                    </th>
                  )}
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {grouped.map((group, gIdx) => {
                  const hasChildren = group.some((e, i) => i > 0 && e.isTrigger)
                  return group.map((ev, idx) => {
                    const ActionIcon = ACTION_ICONS[ev.action]
                    const isChild = idx > 0 && ev.isTrigger
                    const isLastChild = isChild && idx === group.length - 1
                    const isParentWithChildren = idx === 0 && hasChildren
                    const iconBg = ev.isTrigger ? 'bg-amber-50'
                      : ev.risk === 'CRITICO' ? 'bg-red-50'
                      : ev.risk === 'MODERADO' ? 'bg-amber-50'
                      : 'bg-emerald-50'
                    const iconColor = ev.isTrigger ? 'text-amber-600'
                      : ev.risk === 'CRITICO' ? 'text-red-500'
                      : ev.risk === 'MODERADO' ? 'text-amber-500'
                      : 'text-emerald-500'

                    return (
                      <tr
                        key={ev.id}
                        onClick={() => navigate(`/evaluations/${ev.id}`)}
                        className={`group cursor-pointer transition-colors ${
                          isChild
                            ? 'bg-amber-50/20 hover:bg-amber-50/40'
                            : 'hover:bg-slate-50'
                        } ${idx === 0 && gIdx > 0 ? 'border-t-2 border-slate-100' : idx > 0 ? 'border-t border-slate-50' : ''}`}
                      >
                        {/* ID + date + tree connector */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* Tree connector column */}
                            {(isChild || isParentWithChildren) && (
                              <div className="relative flex items-center justify-center w-5 shrink-0 self-stretch -my-3">
                                {/* Vertical line */}
                                {isParentWithChildren && (
                                  <div className="absolute left-1/2 -translate-x-1/2 bg-amber-300 w-px" style={{ top: '50%', bottom: '-12px' }} />
                                )}
                                {isChild && (
                                  <div className="absolute left-1/2 -translate-x-1/2 bg-amber-300 w-px" style={{ top: '-12px', bottom: isLastChild ? '50%' : '-12px' }} />
                                )}
                                {/* Horizontal branch for children */}
                                {isChild && (
                                  <div className="absolute left-1/2 top-1/2 -translate-y-1/2 bg-amber-300 h-px" style={{ width: '10px' }} />
                                )}
                                {/* Node dot */}
                                {isChild && (
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-amber-400" />
                                )}
                              </div>
                            )}
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${iconBg} ${ev.isTrigger ? 'ring-1 ring-amber-200' : ''}`}>
                              {ev.isTrigger
                                ? <Zap className={`h-3.5 w-3.5 ${iconColor}`} />
                                : <ActionIcon className={`h-3.5 w-3.5 ${iconColor}`} />
                              }
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-mono text-xs text-slate-700 truncate max-w-[260px]" title={ev.id}>{ev.id}</p>
                                {ev.isTrigger && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                                    <Zap className="h-2.5 w-2.5" />Gatilho
                                  </span>
                                )}
                                {isParentWithChildren && !ev.isTrigger && (
                                  <span className="inline-flex items-center rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-semibold text-brand-600 ring-1 ring-brand-200">
                                    Original
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400">{formatDate(ev.timestamp)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyId(e, ev.id)}
                              title="Copiar ID completo"
                              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {copiedId === ev.id
                                ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                                : <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                              }
                            </button>
                          </div>
                        </td>

                        {/* Risk badge */}
                        <td className="px-4 py-3">
                          <Badge className={riskColors(ev.risk)} size="sm">{riskLabel(ev.risk)}</Badge>
                        </td>

                        {/* Action badge */}
                        <td className="px-4 py-3">
                          <Badge className={actionColors(ev.action)} size="sm">{actionLabel(ev.action)}</Badge>
                        </td>

                        {/* Score bar */}
                        <td className="px-4 py-3">
                          <ScoreBar score={ev.score} />
                        </td>

                        {/* Gap */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {ev.gapPct > 0
                              ? <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                              : ev.gapPct < 0
                                ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                : <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            }
                            <span className={`text-xs font-semibold tabular-nums ${ev.gapPct > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {ev.gapPct > 0 ? '+' : ''}{ev.gapPct.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {ev.gapPct > 0 ? 'déficit' : ev.gapPct < 0 ? 'excedente' : 'alinhado'}
                            </span>
                          </div>
                        </td>

                        {/* Channel */}
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {ev.channel}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (statusMenuId === ev.id) { setStatusMenuId(null); setStatusMenuPos(null) }
                              else {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                setStatusMenuPos({ top: rect.bottom + 4, left: rect.left })
                                setStatusMenuId(ev.id)
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${evalStatusColors((ev.status || 'ABERTO') as EvaluationStatusType)} hover:shadow-sm`}
                          >
                            {(ev.status || 'ABERTO') === 'CONVERTIDO' && <BadgeCheck className="h-3.5 w-3.5" />}
                            {(ev.status || 'ABERTO') === 'CONVERTIDO_PARCIAL' && <PieChart className="h-3.5 w-3.5" />}
                            {(ev.status || 'ABERTO') === 'ARQUIVADO' && <Archive className="h-3.5 w-3.5" />}
                            {(ev.status || 'ABERTO') === 'ABERTO' && <CircleDot className="h-3.5 w-3.5" />}
                            {evalStatusLabel((ev.status || 'ABERTO') as EvaluationStatusType)}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </button>
                        </td>

                        {/* Broker (Manager+ only) */}
                        {isManagerPlus && (
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-500">
                              {brokerLabel(ev.createdByUserId)}
                            </span>
                          </td>
                        )}

                        {/* Arrow */}
                        <td className="px-4 py-3 text-right">
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </td>
                      </tr>
                    )
                  })
                })}
              </tbody>
            </table>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="py-14 text-center">
                {items.length === 0 ? (
                  <>
                    <p className="text-sm font-semibold text-slate-700">Nenhuma avaliação encontrada</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Realize a primeira avaliação usando Nova Avaliação. Após o resultado, você poderá registrar gatilhos de vida.
                    </p>
                    <button
                      onClick={() => navigate('/evaluations/new')}
                      className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                    >
                      Nova Avaliação
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-700">Nenhum resultado para os filtros aplicados</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Tente remover os filtros ou buscar por outro termo.
                    </p>
                    <button
                      onClick={clearFilters}
                      className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Limpar filtros
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Limit hint */}
        {items.length >= 200 && (
          <p className="text-center text-[11px] text-slate-400">
            Exibindo os 200 registros mais recentes. Use os filtros para encontrar avaliações específicas.
          </p>
        )}

      </div>

      {/* ── Status dropdown (fixed, outside overflow container) ── */}
      {statusMenuId && statusMenuPos && (() => {
        const ev = items.find((e) => e.id === statusMenuId)
        if (!ev) return null
        return (
          <div
            className="fixed z-50 w-44 rounded-xl border border-slate-200 bg-white shadow-xl py-1.5"
            style={{ top: statusMenuPos.top, left: statusMenuPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {(['ABERTO', 'CONVERTIDO', 'CONVERTIDO_PARCIAL', 'ARQUIVADO'] as EvaluationStatusType[])
              .filter((s) => s !== (ev.status || 'ABERTO'))
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => requestStatusChange(e, ev.id, s)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {s === 'CONVERTIDO' && <BadgeCheck className="h-4 w-4 text-emerald-500" />}
                  {s === 'CONVERTIDO_PARCIAL' && <PieChart className="h-4 w-4 text-amber-500" />}
                  {s === 'ARQUIVADO' && <Archive className="h-4 w-4 text-slate-400" />}
                  {s === 'ABERTO' && <CircleDot className="h-4 w-4 text-blue-500" />}
                  <div className="text-left">
                    <p className="font-semibold">{evalStatusLabel(s)}</p>
                    <p className="text-[10px] text-slate-400 font-normal">
                      {s === 'CONVERTIDO' && 'Venda realizada'}
                      {s === 'CONVERTIDO_PARCIAL' && 'Venda parcial com gap'}
                      {s === 'ARQUIVADO' && 'Sem interesse'}
                      {s === 'ABERTO' && 'Reabrir caso'}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        )
      })()}

      {/* ── Status change confirmation modal ── */}
      {confirmAction && (
        <StatusChangeModal
          evaluationId={confirmAction.id}
          initialStatus={confirmAction.status}
          onConfirmed={handleStatusConfirmed}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
