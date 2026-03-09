import { TrendingDown, TrendingUp, CheckCircle, ShieldCheck, Target } from 'lucide-react'
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

  const currentBarColor = isMatch
    ? 'bg-gradient-to-r from-emerald-200 to-emerald-300'
    : isUnder
      ? 'bg-gradient-to-r from-amber-200 to-amber-300'
      : 'bg-gradient-to-r from-sky-200 to-sky-300'

  const recommendedBarColor = isMatch
    ? 'bg-gradient-to-r from-emerald-200 to-emerald-300'
    : 'bg-gradient-to-r from-brand-200 to-brand-300'

  return (
    <div className="space-y-5">
      {/* Bars */}
      <div className="space-y-4">
        {/* Cobertura atual */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Cobertura Atual</span>
            </div>
            <span className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(current)}</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${currentBarColor} transition-all duration-700`}
              style={{ width: `${Math.max(currentPct, current > 0 ? 2 : 0)}%` }}
            />
          </div>
        </div>

        {/* Cobertura recomendada */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Cobertura Recomendada</span>
            </div>
            <span className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(recommended)}</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${recommendedBarColor} transition-all duration-700`}
              style={{ width: `${Math.max(recommendedPct, recommended > 0 ? 2 : 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Difference */}
      {isMatch ? (
        <div className="flex items-center gap-3 rounded-sm bg-emerald-50 border border-emerald-200 px-4 py-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">Cobertura perfeitamente alinhada</p>
            <p className="text-xs text-emerald-600">A apólice atual cobre exatamente a necessidade calculada pelo motor.</p>
          </div>
          <span className="text-lg font-extrabold tabular-nums text-emerald-600">0%</span>
        </div>
      ) : (
        <div className={`rounded-sm border px-4 py-3 ${
          isUnder ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isUnder ? (
                <TrendingDown className="h-5 w-5 shrink-0 text-red-500" />
              ) : (
                <TrendingUp className="h-5 w-5 shrink-0 text-emerald-500" />
              )}
              <div>
                <p className={`text-sm font-semibold ${isUnder ? 'text-red-800' : 'text-emerald-800'}`}>
                  {isUnder ? 'Gap de proteção' : 'Capital excedente'}
                </p>
                <p className={`text-xs ${isUnder ? 'text-red-600' : 'text-emerald-600'}`}>
                  {isUnder
                    ? 'A cobertura atual não atinge a necessidade calculada. Recomende aumento.'
                    : 'A cobertura contratada excede a necessidade. O prêmio pode ser otimizado.'
                  }
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className={`text-lg font-extrabold tabular-nums ${isUnder ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCurrency(Math.abs(gapAmount))}
              </p>
              <p className={`text-xs font-semibold tabular-nums ${isUnder ? 'text-red-500' : 'text-emerald-500'}`}>
                {formatPercent(Math.abs(gapPct))} {isUnder ? 'abaixo' : 'acima'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
