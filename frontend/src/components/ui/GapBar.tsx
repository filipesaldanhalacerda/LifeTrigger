import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency, formatPercent } from '../../lib/utils'

interface GapBarProps {
  current: number
  recommended: number
}

export function GapBar({ current, recommended }: GapBarProps) {
  const max = Math.max(current, recommended) * 1.1
  const currentPct = Math.min((current / max) * 100, 100)
  const recommendedPct = Math.min((recommended / max) * 100, 100)
  const gapAmount = recommended - current
  const gapPct = recommended > 0 ? (gapAmount / recommended) * 100 : 0
  const isUnder = current < recommended

  return (
    <div className="space-y-4">
      {/* Cobertura atual */}
      <div>
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="font-medium text-slate-700">Cobertura Atual</span>
          <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(current)}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-slate-300 to-slate-400 transition-all duration-700"
            style={{ width: `${currentPct}%` }}
          />
        </div>
      </div>

      {/* Cobertura recomendada */}
      <div>
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="font-medium text-slate-700">Cobertura Recomendada</span>
          <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(recommended)}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700"
            style={{ width: `${recommendedPct}%` }}
          />
        </div>
      </div>

      {/* Gap summary */}
      <div
        className={`flex items-center justify-between rounded-xl p-3 ${
          isUnder ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'
        }`}
      >
        <div className="flex items-center gap-2">
          {isUnder ? (
            <TrendingDown className="h-4 w-4 text-red-500" />
          ) : (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          )}
          <span className={`text-sm font-medium ${isUnder ? 'text-red-700' : 'text-emerald-700'}`}>
            {isUnder ? 'Gap de proteção' : 'Capital excedente'}
          </span>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold tabular-nums ${isUnder ? 'text-red-700' : 'text-emerald-700'}`}>
            {formatCurrency(Math.abs(gapAmount))}
          </p>
          <p className={`text-xs tabular-nums ${isUnder ? 'text-red-500' : 'text-emerald-500'}`}>
            {formatPercent(Math.abs(gapPct))}
          </p>
        </div>
      </div>
    </div>
  )
}
