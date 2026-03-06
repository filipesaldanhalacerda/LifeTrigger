import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Users, TrendingUp, TrendingDown, Minus, RotateCcw,
  Loader2, AlertCircle, ChevronRight, ChevronDown,
  ShieldAlert, ShieldQuestion, ShieldCheck,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Badge } from '../components/ui/Badge'
import { getEvaluations, getActiveTenantId } from '../lib/api'
import { actionColors, actionLabel, riskColors, riskLabel, formatDate } from '../lib/utils'
import type { EvaluationSummary, RiskClassification } from '../types/api'

const ACTION_ICONS: Record<string, React.ElementType> = {
  AUMENTAR: TrendingUp,
  MANTER: Minus,
  REDUZIR: TrendingDown,
  REVISAR: RotateCcw,
}

// ── Group evaluations by consentId ────────────────────────────────
interface ClientGroup {
  consentId: string
  evaluations: EvaluationSummary[]
  latestRisk: RiskClassification
  latestScore: number
  latestAction: string
  latestDate: string
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
          <div className="flex items-center gap-3">
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            <div>
              <p className="font-mono text-xs font-semibold text-slate-700">{group.consentId.slice(0, 20)}{group.consentId.length > 20 ? '…' : ''}</p>
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
          <Badge className={actionColors(group.latestAction as never)} size="sm">{actionLabel(group.latestAction as never)}</Badge>
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
            className="bg-slate-50 hover:bg-brand-50 cursor-pointer transition-colors"
            onClick={(e) => { e.stopPropagation(); navigate(`/evaluations/${ev.id}`) }}
          >
            <td className="py-2.5 pl-14 pr-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200">
                  <EvIcon className="h-3 w-3 text-slate-500" />
                </div>
                <p className="font-mono text-[11px] text-slate-500">{ev.id.slice(0, 18)}…</p>
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

// ── Main component ─────────────────────────────────────────────────
export default function ClientHistory() {
  const [items,   setItems]   = useState<EvaluationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [search,  setSearch]  = useState('')

  function load() {
    setLoading(true)
    setError(null)
    getEvaluations(getActiveTenantId(), { limit: 200 })
      .then((res) => setItems(res.items))
      .catch(() => setError('Não foi possível carregar o histórico de clientes.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const groups = buildGroups(items)
  const filtered = search.trim()
    ? groups.filter((g) => g.consentId.toLowerCase().includes(search.toLowerCase()))
    : groups

  return (
    <div>
      <TopBar
        title="Histórico de Clientes"
        subtitle={loading ? 'Carregando…' : `${groups.length} cliente${groups.length !== 1 ? 's' : ''} · ${items.length} avaliações`}
      />

      <div className="p-6 space-y-5 animate-fadeIn">

        {/* ── Summary cards ── */}
        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
                <Users className="h-4 w-4 text-brand-600" />
              </div>
              <p className="text-xl font-bold tabular-nums text-slate-900">{groups.length}</p>
              <p className="text-xs font-semibold text-slate-700">Clientes únicos</p>
              <p className="mt-0.5 text-[11px] text-slate-400">identificados por consentId</p>
            </div>
            {[
              { label: 'Risco Crítico',  count: groups.filter((g) => g.latestRisk === 'CRITICO').length,  bg: 'bg-red-50',     icon: <ShieldAlert   className="h-4 w-4 text-red-500" /> },
              { label: 'Risco Moderado', count: groups.filter((g) => g.latestRisk === 'MODERADO').length, bg: 'bg-amber-50',   icon: <ShieldQuestion className="h-4 w-4 text-amber-500" /> },
              { label: 'Risco Adequado', count: groups.filter((g) => g.latestRisk === 'ADEQUADO').length, bg: 'bg-emerald-50', icon: <ShieldCheck   className="h-4 w-4 text-emerald-500" /> },
            ].map(({ label, count, bg, icon }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
                <p className="text-xl font-bold tabular-nums text-slate-900">{count}</p>
                <p className="text-xs font-semibold text-slate-700">{label}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">última avaliação</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Search ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por consentId…"
            className="w-full max-w-sm rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-card focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            <span className="text-sm">Carregando histórico de clientes…</span>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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
                  {groups.length === 0 ? 'Nenhuma avaliação realizada ainda' : 'Nenhum cliente encontrado'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {groups.length === 0
                    ? 'Realize a primeira avaliação para visualizar o histórico de clientes.'
                    : 'Tente um consentId diferente.'}
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
                  <p className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700 tabular-nums">{filtered.length}</span>{' '}
                    cliente{filtered.length !== 1 ? 's' : ''} — clique em uma linha para ver o histórico completo de avaliações.
                  </p>
                </div>
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
                      <th className="px-4 py-3 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((group) => (
                      <ClientGroupRow key={group.consentId} group={group} />
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
