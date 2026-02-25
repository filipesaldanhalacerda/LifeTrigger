import type { RecommendedAction, RiskClassification, CoverageStatus } from '../types/api'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

// ── Action styling ──────────────────────────────────────────────
export function actionLabel(action: RecommendedAction): string {
  const map: Record<RecommendedAction, string> = {
    AUMENTAR: 'Aumentar',
    MANTER: 'Manter',
    REDUZIR: 'Reduzir',
    REVISAR: 'Revisar',
  }
  return map[action]
}

export function actionColors(action: RecommendedAction): string {
  const map: Record<RecommendedAction, string> = {
    AUMENTAR: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    MANTER: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    REDUZIR: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    REVISAR: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  }
  return map[action]
}

// ── Risk styling ────────────────────────────────────────────────
export function riskLabel(risk: RiskClassification): string {
  const map: Record<RiskClassification, string> = {
    CRITICO: 'Crítico',
    MODERADO: 'Moderado',
    ADEQUADO: 'Adequado',
  }
  return map[risk]
}

export function riskColors(risk: RiskClassification): string {
  const map: Record<RiskClassification, string> = {
    CRITICO: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    MODERADO: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    ADEQUADO: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  }
  return map[risk]
}

export function riskScoreColor(score: number): string {
  if (score < 30) return 'text-red-600'
  if (score < 70) return 'text-amber-600'
  return 'text-emerald-600'
}

export function riskScoreStroke(score: number): string {
  if (score < 30) return '#dc2626'
  if (score < 70) return '#d97706'
  return '#059669'
}

// ── Coverage status ─────────────────────────────────────────────
export function coverageStatusLabel(status: CoverageStatus): string {
  const map: Record<CoverageStatus, string> = {
    SUBPROTEGIDO: 'Subprotegido',
    ADEQUADO: 'Adequado',
    SOBRESEGURADO: 'Sobresegurado',
  }
  return map[status]
}

// ── Idempotency key ─────────────────────────────────────────────
export function generateIdempotencyKey(): string {
  return `ui-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ── Class merge helper ──────────────────────────────────────────
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
