import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Filter, TrendingUp, TrendingDown, Minus, RotateCcw,
  Loader2, AlertCircle, ChevronRight, RefreshCw, Users,
  ShieldAlert, ShieldCheck, ShieldQuestion, Copy, Check,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Badge } from '../components/ui/Badge'
import { actionColors, actionLabel, riskColors, riskLabel, formatDate, riskScoreColor } from '../lib/utils'
import { getEvaluations, getActiveTenantId } from '../lib/api'
import type { EvaluationSummary, RecommendedAction } from '../types/api'

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
      className={`w-full rounded-xl border p-4 text-left shadow-xs transition-all ${
        active
          ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100'
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
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
            Filtrado
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function EvaluationHistory() {
  const navigate = useNavigate()
  const [items, setItems]               = useState<EvaluationSummary[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [search, setSearch]             = useState('')
  const [filterAction, setFilterAction] = useState<string>('')
  const [filterRisk, setFilterRisk]     = useState<string>('')
  const [copiedId, setCopiedId]         = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    getEvaluations(getActiveTenantId(), { limit: 200 })
      .then((res) => setItems(res.items))
      .catch(() => setError('Não foi possível carregar o histórico. Verifique a conexão e tente novamente.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function copyId(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    })
  }

  function clearFilters() {
    setSearch('')
    setFilterAction('')
    setFilterRisk('')
  }

  const filtered = items.filter((ev) => {
    const q = search.toLowerCase()
    if (q && !ev.id.toLowerCase().includes(q) && !ev.channel.toLowerCase().includes(q)) return false
    if (filterAction && ev.action !== filterAction) return false
    if (filterRisk && ev.risk !== filterRisk) return false
    return true
  })

  const riskCounts = {
    critico:  items.filter((e) => e.risk === 'CRITICO').length,
    moderado: items.filter((e) => e.risk === 'MODERADO').length,
    adequado: items.filter((e) => e.risk === 'ADEQUADO').length,
  }

  const hasActiveFilters = !!(search || filterAction || filterRisk)

  return (
    <div>
      <TopBar
        title="Histórico de Avaliações"
        subtitle={loading ? 'Carregando…' : `${filtered.length} de ${items.length} registros`}
      />

      <div className="p-6 space-y-5">

        {/* Summary cards */}
        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard
              label="Total"
              value={items.length}
              icon={Users}
              iconBg="bg-slate-100"
              iconColor="text-slate-600"
              hint="avaliações carregadas"
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ID ou canal…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className={`h-4 w-4 ${hasActiveFilters ? 'text-indigo-500' : 'text-slate-400'}`} />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:border-indigo-400 focus:outline-none"
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:border-indigo-400 focus:outline-none"
            >
              <option value="">Todos os riscos</option>
              <option value="CRITICO">Risco Crítico</option>
              <option value="MODERADO">Risco Moderado</option>
              <option value="ADEQUADO">Risco Adequado</option>
            </select>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-xs hover:text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-xs hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-20 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <span className="text-sm">Carregando histórico…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Não foi possível carregar</p>
              <p className="mt-0.5 text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">

            {/* Table hint */}
            {filtered.length > 0 && (
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
                <p className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">{filtered.length}</span>{' '}
                  avaliação{filtered.length !== 1 ? 'ões' : ''} — clique em uma linha para ver o resultado completo. Use os cards acima para filtrar por risco.
                </p>
              </div>
            )}

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
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ev) => {
                  const ActionIcon = ACTION_ICONS[ev.action]
                  const iconBg =
                    ev.risk === 'CRITICO' ? 'bg-red-50'
                    : ev.risk === 'MODERADO' ? 'bg-amber-50'
                    : 'bg-emerald-50'
                  const iconColor =
                    ev.risk === 'CRITICO' ? 'text-red-500'
                    : ev.risk === 'MODERADO' ? 'text-amber-500'
                    : 'text-emerald-500'

                  return (
                    <tr
                      key={ev.id}
                      onClick={() => navigate(`/evaluations/${ev.id}`)}
                      className="group cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      {/* ID + date */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${iconBg}`}>
                            <ActionIcon className={`h-3.5 w-3.5 ${iconColor}`} />
                          </div>
                          <div>
                            <p className="font-mono text-xs text-slate-700">{ev.id.slice(0, 18)}…</p>
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
                            : <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          }
                          <span className={`text-xs font-semibold tabular-nums ${ev.gapPct > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {ev.gapPct > 0 ? '+' : ''}{ev.gapPct.toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {ev.gapPct > 0 ? 'déficit' : 'excedente'}
                          </span>
                        </div>
                      </td>

                      {/* Channel */}
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {ev.channel}
                        </span>
                      </td>

                      {/* Arrow */}
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="py-14 text-center">
                {items.length === 0 ? (
                  <>
                    <p className="text-sm font-semibold text-slate-700">Nenhuma avaliação encontrada</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Realize a primeira avaliação usando Nova Avaliação ou Gatilho de Vida.
                    </p>
                    <button
                      onClick={() => navigate('/evaluations/new')}
                      className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
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
    </div>
  )
}
