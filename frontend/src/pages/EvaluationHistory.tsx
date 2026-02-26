import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, TrendingUp, TrendingDown, Minus, RotateCcw, Loader2, AlertCircle } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Badge } from '../components/ui/Badge'
import { actionColors, actionLabel, riskColors, riskLabel, formatDate } from '../lib/utils'
import { getEvaluations, getActiveTenantId } from '../lib/api'
import type { EvaluationSummary, RecommendedAction } from '../types/api'

const ACTION_ICONS: Record<RecommendedAction, React.ElementType> = {
  AUMENTAR: TrendingUp,
  MANTER: Minus,
  REDUZIR: TrendingDown,
  REVISAR: RotateCcw,
}

export default function EvaluationHistory() {
  const navigate = useNavigate()
  const [items, setItems]               = useState<EvaluationSummary[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [search, setSearch]             = useState('')
  const [filterAction, setFilterAction] = useState<string>('')
  const [filterRisk, setFilterRisk]     = useState<string>('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getEvaluations(getActiveTenantId(), { limit: 200 })
      .then((res) => { if (!cancelled) setItems(res.items) })
      .catch(() => { if (!cancelled) setError('Não foi possível carregar o histórico.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = items.filter((ev) => {
    if (search && !ev.id.toLowerCase().includes(search.toLowerCase())) return false
    if (filterAction && ev.action !== filterAction) return false
    if (filterRisk && ev.risk !== filterRisk) return false
    return true
  })

  return (
    <div>
      <TopBar title="Histórico de Avaliações" subtitle={loading ? 'Carregando…' : `${filtered.length} registros`} />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:border-indigo-400 focus:outline-none"
            >
              <option value="">Todas as ações</option>
              <option value="AUMENTAR">Aumentar</option>
              <option value="MANTER">Manter</option>
              <option value="REDUZIR">Reduzir</option>
              <option value="REVISAR">Revisar</option>
            </select>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus:border-indigo-400 focus:outline-none"
            >
              <option value="">Todos os riscos</option>
              <option value="CRITICO">Crítico</option>
              <option value="MODERADO">Moderado</option>
              <option value="ADEQUADO">Adequado</option>
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Risco</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ação</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Score</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Gap</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Canal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ev) => {
                  const ActionIcon = ACTION_ICONS[ev.action]
                  return (
                    <tr
                      key={ev.id}
                      onClick={() => navigate(`/evaluations/${ev.id}`)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100">
                            <ActionIcon className="h-3.5 w-3.5 text-slate-500" />
                          </div>
                          <span className="font-mono text-xs text-slate-500">{ev.id.slice(0, 18)}…</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(ev.timestamp)}</td>
                      <td className="px-4 py-3">
                        <Badge className={riskColors(ev.risk)} size="sm">{riskLabel(ev.risk)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={actionColors(ev.action)} size="sm">{actionLabel(ev.action)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${ev.score < 30 ? 'text-red-600' : ev.score < 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {ev.score.toFixed(0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-medium ${ev.gapPct > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {ev.gapPct > 0 ? '+' : ''}{ev.gapPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{ev.channel}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-400">
                {items.length === 0
                  ? 'Nenhuma avaliação encontrada para este tenant.'
                  : 'Nenhum resultado para os filtros aplicados.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
