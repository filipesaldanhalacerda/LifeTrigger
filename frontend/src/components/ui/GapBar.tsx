import { TrendingDown, TrendingUp, Equal } from 'lucide-react'
import { formatCurrency, formatPercent } from '../../lib/utils'

interface GapBarProps {
  current: number
  recommended: number
}

export function GapBar({ current, recommended }: GapBarProps) {
  const bigger = Math.max(current, recommended)
  const currentPct = bigger > 0 ? Math.min((current / bigger) * 100, 100) : 0
  const recommendedPct = bigger > 0 ? Math.min((recommended / bigger) * 100, 100) : 0
  const gapAmount = recommended - current
  const gapPct = recommended > 0 ? (gapAmount / recommended) * 100 : 0
  const isUnder = current < recommended
  const isMatch = current === recommended && current > 0

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
            className={`h-3 rounded-full transition-all duration-700 ${
              isMatch
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                : 'bg-gradient-to-r from-slate-300 to-slate-400'
            }`}
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
            className={`h-3 rounded-full transition-all duration-700 ${
              isMatch
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                : 'bg-gradient-to-r from-brand-400 to-brand-600'
            }`}
            style={{ width: `${recommendedPct}%` }}
          />
        </div>
      </div>

      {/* Gap summary */}
      {isMatch ? (
        <div className="flex items-center justify-between rounded-xl p-3 bg-emerald-50 border border-emerald-100">
          <div className="flex items-center gap-2">
            <Equal className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-700">
              Cobertura perfeitamente alinhada
            </span>
          </div>
          <p className="text-sm font-bold tabular-nums text-emerald-700">0%</p>
        </div>
      ) : (
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
      )}
    </div>
  )
}
