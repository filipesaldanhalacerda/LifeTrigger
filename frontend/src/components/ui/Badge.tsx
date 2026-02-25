import { cn } from '../../lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Badge({ children, className, size = 'md' }: BadgeProps) {
  const sizeClass = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }[size]

  return (
    <span className={cn('inline-flex items-center rounded-full font-medium', sizeClass, className)}>
      {children}
    </span>
  )
}
