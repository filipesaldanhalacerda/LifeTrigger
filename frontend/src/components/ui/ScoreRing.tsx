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
    // Outer container: fixed dimensions + relative so children can overlay
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Ring SVG — absolute so it fills the container; rotated so progress starts at top */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
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

      {/* Centered text — relative + z-10 sits on top of the SVG */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <span className={`font-bold leading-none ${riskScoreColor(score)}`} style={{ fontSize: size * 0.22 }}>
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
