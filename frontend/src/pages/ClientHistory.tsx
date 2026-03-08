import { useEffect, useState } from 'react'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import { useNavigate } from 'react-router-dom'
import {
  Search, Users, TrendingUp, TrendingDown, Minus, RotateCcw,
  AlertCircle, ChevronRight, ChevronDown,
  ShieldAlert, ShieldQuestion, ShieldCheck, Copy, Check,
  CircleDot, Archive, BadgeCheck, PieChart, X,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Badge } from '../components/ui/Badge'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { getEvaluations, getActiveTenantId } from '../lib/api'
import { actionColors, actionLabel, riskColors, riskLabel, formatDate, evalStatusLabel, evalStatusColors } from '../lib/utils'
import { daysAgo, today, nextDay } from '../lib/dates'
import type { EvaluationSummary, RiskClassification, RecommendedAction, EvaluationStatusType } from '../types/api'

const ACTION_ICONS: Record<string, React.ElementType> = {
  AUMENTAR: TrendingUp,
  MANTER: Minus,
  REDUZIR: TrendingDown,
  REVISAR: RotateCcw,
}

const STATUS_OPTIONS: { key: EvaluationStatusType; icon: React.ElementType; color: string; activeBg: string; activeText: string }[] = [
  { key: 'ABERTO', icon: CircleDot, color: 'text-blue-500', activeBg: 'bg-blue-50 border-blue-300 ring-2 ring-blue-100', activeText: 'text-blue-700' },
  { key: 'CONVERTIDO', icon: BadgeCheck, color: 'text-emerald-500', activeBg: 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-100', activeText: 'text-emerald-700' },
  { key: 'CONVERTIDO_PARCIAL', icon: PieChart, color: 'text-amber-500', activeBg: 'bg-amber-50 border-amber-300 ring-2 ring-amber-100', activeText: 'text-amber-700' },
  { key: 'ARQUIVADO', icon: Archive, color: 'text-slate-400', activeBg: 'bg-slate-100 border-slate-300 ring-2 ring-slate-200', activeText: 'text-slate-600' },
]

// ── Group evaluations by consentId ────────────────────────────────
interface ClientGroup {
  consentId: string
  evaluations: EvaluationSummary[]
  latestRisk: RiskClassification
  latestScore: number
  latestAction: string
  latestDate: string
  latestStatus: string
}

function buildGroups(items: EvaluationSummary[]): ClientGroup[] {
  const map = new Map<string, EvaluationSummary[]>()
  for (const ev of items) {
    const key = ev.consentId ?? 'sem-consentimento'
    const arr = map.get(key) ?? []
    arr.push(ev)
    map.set(key, arr)
  }
  return [...map.entries()].map(([consentId, evs]) => {
    const sorted = [...evs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const latest = sorted[0]
    return {
      consentId,
      evaluations: sorted,
      latestRisk:   latest.risk,
      latestScore:  latest.score,
      latestAction: latest.action,
      latestDate:   latest.timestamp,
      latestStatus: latest.status || 'ABERTO',
    }
  }).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime())
}

// ── Risk icon helper ──────────────────────────────────────────────
function RiskIcon({ risk }: { risk: RiskClassification }) {
  if (risk === 'CRITICO')  return <ShieldAlert   className="h-4 w-4 text-red-500" />
  if (risk === 'MODERADO') return <ShieldQuestion className="h-4 w-4 text-amber-500" />
  return                          <ShieldCheck    className="h-4 w-4 text-emerald-500" />
}

// ── Client group row ──────────────────────────────────────────────
function ClientGroupRow({ group }: { group: ClientGroup }) {
  const navigate   = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [copiedId, copyId] = useCopyToClipboard()
  const scoreColor = group.latestScore >= 70 ? 'bg-emerald-500' : group.latestScore >= 40 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <>
      {/* Client summary row */}
      <tr
        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Expand toggle + consent ID */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3 group">
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-mono text-xs font-semibold text-slate-700 truncate max-w-[260px]" title={group.consentId}>{group.consentId}</p>
                <button
                  type="button"
                  onClick={(e) => copyId(e, group.consentId)}
                  title="Copiar consentId"
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copiedId === group.consentId
                    ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                    : <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                  }
                </button>
              </div>
              <p className="text-[11px] text-slate-400 tabular-nums">{group.evaluations.length} avaliação{group.evaluations.length !== 1 ? 'ões' : ''}</p>
            </div>
          </div>
        </td>

        {/* Last evaluation date */}
        <td className="px-4 py-3 text-xs text-slate-500">{formatDate(group.latestDate)}</td>

        {/* Risk badge */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <RiskIcon risk={group.latestRisk} />
            <Badge className={riskColors(group.latestRisk)} size="sm">{riskLabel(group.latestRisk)}</Badge>
          </div>
        </td>

        {/* Action badge */}
        <td className="px-4 py-3">
          <Badge className={actionColors(group.latestAction as RecommendedAction)} size="sm">{actionLabel(group.latestAction as RecommendedAction)}</Badge>
        </td>

        {/* Score */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-1.5 rounded-full transition-all ${scoreColor}`} style={{ width: `${Math.max(4, group.latestScore)}%` }} />
            </div>
            <span className="text-xs font-bold tabular-nums text-slate-700">{group.latestScore.toFixed(0)}</span>
          </div>
        </td>

        {/* Status badge */}
        <td className="px-4 py-3">
          <Badge className={evalStatusColors(group.latestStatus as EvaluationStatusType)} size="sm">
            {evalStatusLabel(group.latestStatus as EvaluationStatusType)}
          </Badge>
        </td>

        <td className="px-4 py-3 text-right">
          <ChevronDown className={`h-4 w-4 text-slate-300 transition-transform ml-auto ${expanded ? 'rotate-180' : ''}`} />
        </td>
      </tr>

      {/* Expanded: individual evaluations */}
      {expanded && group.evaluations.map((ev) => {
        const EvIcon = ACTION_ICONS[ev.action] ?? Minus
        return (
          <tr
            key={ev.id}
            className="bg-slate-50 hover:bg-brand-50 cursor-pointer transition-colors group/row"
            onClick={(e) => { e.stopPropagation(); navigate(`/evaluations/${ev.id}`) }}
          >
            <td className="py-2.5 pl-14 pr-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200">
                  <EvIcon className="h-3 w-3 text-slate-500" />
                </div>
                <p className="font-mono text-[11px] text-slate-500 truncate max-w-[220px]" title={ev.id}>{ev.id}</p>
                <button
                  type="button"
                  onClick={(e) => copyId(e, ev.id)}
                  title="Copiar ID"
                  className="shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity"
                >
                  {copiedId === ev.id
                    ? <Check className="h-3 w-3 text-emerald-500" />
                    : <Copy className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                  }
                </button>
              </div>
            </td>
            <td className="px-4 py-2.5 text-[11px] text-slate-400">{formatDate(ev.timestamp)}</td>
            <td className="px-4 py-2.5">
              <Badge className={riskColors(ev.risk)} size="sm">{riskLabel(ev.risk)}</Badge>
            </td>
            <td className="px-4 py-2.5">
              <Badge className={actionColors(ev.action)} size="sm">{actionLabel(ev.action)}</Badge>
            </td>
            <td className="px-4 py-2.5">
              <span className="text-xs text-slate-600 tabular-nums">{ev.score.toFixed(0)}</span>
            </td>
            <td className="px-4 py-2.5 text-right">
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto" />
            </td>
          </tr>
        )
      })}
    </>
  )
}

// ── Mobile client card ───────────────────────────────────────────────
function MobileClientCard({ group }: { group: ClientGroup }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [copiedId, copyId] = useCopyToClipboard()
  const scoreColor = group.latestScore >= 70 ? 'bg-emerald-500' : group.latestScore >= 40 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div>
      <div
        onClick={() => setExpanded((v) => !v)}
        className="flex items-start gap-3 px-4 py-3 cursor-pointer active:bg-slate-50"
      >
        <RiskIcon risk={group.latestRisk} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-mono text-xs font-semibold text-slate-700 truncate" title={group.consentId}>
                {group.consentId}
              </p>
              <button
                type="button"
                onClick={(e) => copyId(e, group.consentId)}
                title="Copiar consentId"
                className="shrink-0"
              >
                {copiedId === group.consentId
                  ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                  : <Copy className="h-3.5 w-3.5 text-slate-400" />
                }
              </button>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge className={riskColors(group.latestRisk)} size="sm">{riskLabel(group.latestRisk)}</Badge>
            <Badge className={actionColors(group.latestAction as RecommendedAction)} size="sm">{actionLabel(group.latestAction as RecommendedAction)}</Badge>
            <Badge className={evalStatusColors(group.latestStatus as EvaluationStatusType)} size="sm">{evalStatusLabel(group.latestStatus as EvaluationStatusType)}</Badge>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-1.5 rounded-full ${scoreColor}`} style={{ width: `${Math.max(4, group.latestScore)}%` }} />
              </div>
              <span className="text-xs font-bold tabular-nums text-slate-700">{group.latestScore.toFixed(0)}</span>
            </div>
            <span className="text-[11px] text-slate-400 tabular-nums">{group.evaluations.length} aval.</span>
            <span className="text-[11px] text-slate-400">{formatDate(group.latestDate)}</span>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="bg-slate-50 divide-y divide-slate-100">
          {group.evaluations.map((ev) => {
            const EvIcon = ACTION_ICONS[ev.action] ?? Minus
            return (
              <div
                key={ev.id}
                onClick={() => navigate(`/evaluations/${ev.id}`)}
                className="flex items-center gap-3 px-4 py-2.5 pl-11 cursor-pointer active:bg-brand-50"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200">
                  <EvIcon className="h-3 w-3 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-mono text-[11px] text-slate-500 truncate" title={ev.id}>{ev.id}</p>
                    <button
                      type="button"
                      onClick={(e) => copyId(e, ev.id)}
                      title="Copiar ID"
                      className="shrink-0"
                    >
                      {copiedId === ev.id
                        ? <Check className="h-3 w-3 text-emerald-500" />
                        : <Copy className="h-3 w-3 text-slate-400" />
                      }
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">{formatDate(ev.timestamp)}</p>
                </div>
                <Badge className={riskColors(ev.risk)} size="sm">{riskLabel(ev.risk)}</Badge>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function ClientHistory() {
  const [items,   setItems]   = useState<EvaluationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [search,  setSearch]  = useState('')
  const [filterRisk, setFilterRisk]     = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterAction, setFilterAction] = useState<string>('')
  const [startDate, setStartDate]       = useState(() => daysAgo(90))
  const [endDate, setEndDate]           = useState(() => today())

  function load() {
    setLoading(true)
    setError(null)
    getEvaluations(getActiveTenantId(), { startDate, endDate: nextDay(endDate), limit: 200 })
      .then((res) => setItems(res.items))
      .catch(() => setError('Não foi possível carregar o histórico de clientes.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [startDate, endDate])

  function clearFilters() {
    setSearch('')
    setFilterRisk('')
    setFilterStatus('')
    setFilterAction('')
  }

  const groups = buildGroups(items)

  // Filter groups by client-level attributes (latest evaluation)
  const filtered = groups.filter((g) => {
    if (search.trim() && !g.consentId.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRisk && g.latestRisk !== filterRisk) return false
    if (filterStatus && g.latestStatus !== filterStatus) return false
    if (filterAction && g.latestAction !== filterAction) return false
    return true
  })

  const hasActiveFilters = !!(search || filterRisk || filterStatus || filterAction)

  // Counts for pills (before search/dropdown filters, so user sees total context)
  const riskCounts = {
    CRITICO:  groups.filter((g) => g.latestRisk === 'CRITICO').length,
    MODERADO: groups.filter((g) => g.latestRisk === 'MODERADO').length,
    ADEQUADO: groups.filter((g) => g.latestRisk === 'ADEQUADO').length,
  }
  const statusCounts = {
    ABERTO:             groups.filter((g) => g.latestStatus === 'ABERTO').length,
    CONVERTIDO:         groups.filter((g) => g.latestStatus === 'CONVERTIDO').length,
    CONVERTIDO_PARCIAL: groups.filter((g) => g.latestStatus === 'CONVERTIDO_PARCIAL').length,
    ARQUIVADO:          groups.filter((g) => g.latestStatus === 'ARQUIVADO').length,
  }

  return (
    <div>
      <TopBar
        title="Meus Clientes"
        subtitle={loading ? 'Carregando…' : `${filtered.length} de ${groups.length} clientes · ${items.length} avaliações`}
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-fadeIn">

        {/* ── Summary cards (clickable for risk filter) ── */}
        {!loading && !error && groups.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => setFilterRisk('')}
              className={`w-full rounded-2xl border p-4 text-left shadow-card transition-all ${
                !filterRisk
                  ? 'border-brand-300 bg-brand-50 ring-2 ring-brand-100'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
                  <Users className="h-4 w-4 text-brand-600" />
                </div>
                {!filterRisk && (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-600">Todos</span>
                )}
              </div>
              <p className="text-xl font-bold tabular-nums text-slate-900">{groups.length}</p>
              <p className="text-xs font-semibold text-slate-700">Clientes</p>
              <p className="mt-0.5 text-[11px] text-slate-400">identificados por consentId</p>
            </button>
            {([
              { risk: 'CRITICO' as const,  label: 'Risco Crítico',  bg: 'bg-red-50',     iconColor: 'text-red-600',     Icon: ShieldAlert },
              { risk: 'MODERADO' as const, label: 'Risco Moderado', bg: 'bg-amber-50',   iconColor: 'text-amber-600',   Icon: ShieldQuestion },
              { risk: 'ADEQUADO' as const, label: 'Risco Adequado', bg: 'bg-emerald-50', iconColor: 'text-emerald-600', Icon: ShieldCheck },
            ] as const).map(({ risk, label, bg, iconColor, Icon }) => {
              const isActive = filterRisk === risk
              return (
                <button
                  key={risk}
                  type="button"
                  onClick={() => setFilterRisk(isActive ? '' : risk)}
                  className={`w-full rounded-2xl border p-4 text-left shadow-card transition-all ${
                    isActive
                      ? 'border-brand-300 bg-brand-50 ring-2 ring-brand-100'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    {isActive && (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-600">Filtrado</span>
                    )}
                  </div>
                  <p className="text-xl font-bold tabular-nums text-slate-900">{riskCounts[risk]}</p>
                  <p className="text-xs font-semibold text-slate-700">{label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">última avaliação</p>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Filter section ── */}
        <div className="space-y-3">

          {/* Row 1: Search + DateRangePicker */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-0 sm:min-w-52">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por consentId…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-card focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              maxDate={today()}
              onChange={(s, e) => { setStartDate(s); setEndDate(e) }}
              align="right"
            />
          </div>

          {/* Row 2: Status pills + action dropdown */}
          {!loading && !error && groups.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_OPTIONS.map(({ key, icon: SIcon, color, activeBg, activeText }) => {
                const isActive = filterStatus === key
                const count = statusCounts[key]
                if (count === 0 && !isActive) return null
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilterStatus(isActive ? '' : key)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? activeBg + ' ' + activeText
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <SIcon className={`h-3.5 w-3.5 ${isActive ? activeText : color}`} />
                    {evalStatusLabel(key)}
                    <span className={`ml-0.5 tabular-nums ${isActive ? 'opacity-80' : 'text-slate-400'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}

              {/* Separator */}
              <div className="hidden sm:block h-5 w-px bg-slate-200" />

              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-card focus:border-brand-400 focus:outline-none"
              >
                <option value="">Ação</option>
                <option value="AUMENTAR">Aumentar</option>
                <option value="MANTER">Manter</option>
                <option value="REDUZIR">Reduzir</option>
                <option value="REVISAR">Revisar</option>
              </select>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-500 shadow-card hover:text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="space-y-2">
            <div className="skeleton h-14 w-full rounded-xl" />
            <div className="skeleton h-14 w-full rounded-xl" />
            <div className="skeleton h-14 w-full rounded-xl" />
            <div className="skeleton h-14 w-full rounded-xl" />
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Erro ao carregar</p>
              <p className="mt-0.5 text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        {!loading && !error && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                <p className="text-sm font-semibold text-slate-700">
                  {groups.length === 0 ? 'Nenhum cliente no período selecionado' : 'Nenhum cliente para os filtros aplicados'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {groups.length === 0
                    ? 'Tente ampliar o intervalo de datas ou realize a primeira avaliação.'
                    : 'Tente remover os filtros ou buscar por outro consentId.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
                  <p className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700 tabular-nums">{filtered.length}</span>{' '}
                    cliente{filtered.length !== 1 ? 's' : ''} — clique para expandir o histórico de avaliações.
                  </p>
                </div>
                {/* Mobile card list */}
                <div className="divide-y divide-slate-100 sm:hidden">
                  {filtered.map((group) => (
                    <MobileClientCard key={group.consentId} group={group} />
                  ))}
                </div>
                <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Cliente (consentId)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Última avaliação
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Risco Atual
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ação
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Score
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-4 py-3 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((group) => (
                      <ClientGroupRow key={group.consentId} group={group} />
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Limit hint */}
        {items.length >= 200 && (
          <p className="text-center text-[11px] text-slate-400">
            Exibindo os 200 registros mais recentes. Use o filtro de data para encontrar clientes específicos.
          </p>
        )}
      </div>
    </div>
  )
}
