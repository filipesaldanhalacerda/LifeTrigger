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
          <span className="font-semibold text-slate-900">{formatCurrency(current)}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-slate-400 transition-all duration-700"
            style={{ width: `${currentPct}%` }}
          />
        </div>
      </div>

      {/* Cobertura recomendada */}
      <div>
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="font-medium text-slate-700">Cobertura Recomendada</span>
          <span className="font-semibold text-slate-900">{formatCurrency(recommended)}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-indigo-500 transition-all duration-700"
            style={{ width: `${recommendedPct}%` }}
          />
        </div>
      </div>

      {/* Gap summary */}
      <div
        className={`flex items-center justify-between rounded-lg p-3 ${
          isUnder ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'
        }`}
      >
        <span className={`text-sm font-medium ${isUnder ? 'text-red-700' : 'text-emerald-700'}`}>
          {isUnder ? 'Gap de proteção' : 'Capital excedente'}
        </span>
        <div className="text-right">
          <p className={`text-sm font-bold ${isUnder ? 'text-red-700' : 'text-emerald-700'}`}>
            {formatCurrency(Math.abs(gapAmount))}
          </p>
          <p className={`text-xs ${isUnder ? 'text-red-500' : 'text-emerald-500'}`}>
            {formatPercent(Math.abs(gapPct))}
          </p>
        </div>
      </div>
    </div>
  )
}
