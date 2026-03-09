import { cn } from '../../lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: { label: string; positive?: boolean }
  className?: string
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-brand-600',
  iconBg = 'bg-brand-50',
  trend,
  className,
}: MetricCardProps) {
  return (
    <div className={cn(
      'rounded-sm border border-slate-200 bg-white p-5 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5',
      className,
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          {trend && (
            <p
              className={`mt-2 text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}
            >
              {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('rounded-sm p-2.5', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        )}
      </div>
    </div>
  )
}
