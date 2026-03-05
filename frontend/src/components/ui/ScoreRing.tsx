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

  // Gradient ID unique per instance
  const gradientId = `score-grad-${score}-${size}`

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
          <filter id={`glow-${gradientId}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc with gradient and glow */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter={`url(#glow-${gradientId})`}
          className="transition-all duration-700 ease-out"
        />
      </svg>

      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <span className={`font-extrabold leading-none ${riskScoreColor(score)}`} style={{ fontSize: size * 0.24 }}>
          {score}
        </span>
        {label && (
          <span
            className="mt-0.5 font-semibold text-slate-400 leading-tight"
            style={{ fontSize: size * 0.085, maxWidth: size * 0.7 }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
