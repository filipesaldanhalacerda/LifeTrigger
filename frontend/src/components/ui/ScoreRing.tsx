import { riskScoreColor, riskScoreStroke } from '../../lib/utils'

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
}

export function ScoreRing({ score, size = 120, strokeWidth = 8, label }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(score, 0), 100)
  const offset = circumference - (progress / 100) * circumference
  const color = riskScoreStroke(score)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Label centered */}
      <div
        className="flex flex-col items-center"
        style={{ marginTop: -(size / 2 + 8) }}
      >
        <span className={`text-2xl font-bold leading-none ${riskScoreColor(score)}`}>{score}</span>
        {label && <span className="mt-1 text-[11px] font-medium text-slate-500">{label}</span>}
      </div>
      {/* Spacer */}
      <div style={{ height: size / 2 - 8 }} />
    </div>
  )
}
