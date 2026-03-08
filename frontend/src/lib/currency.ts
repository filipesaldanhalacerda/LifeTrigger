/**
 * Shared currency helpers for Brazilian Real (BRL).
 *
 * Values are stored internally as a digits-only string representing **cents**.
 * Example: "1500000" = R$ 15.000,00
 */

/** Convert a cents-string to a reais number (e.g. "1500000" → 15000) */
export function parseCurrency(raw: string): number {
  if (!raw) return 0
  const cents = parseInt(raw, 10) || 0
  return cents / 100
}

/** Format a cents-string for display (e.g. "1500000" → "15.000,00") */
export function formatCurrencyLive(raw: string): string {
  if (!raw) return ''
  const cents = parseInt(raw, 10) || 0
  const reais = cents / 100
  return reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Convert a reais number to a cents-string (e.g. 15000 → "1500000") */
export function reaisToCentsStr(value: number): string {
  return String(Math.round(value * 100))
}
