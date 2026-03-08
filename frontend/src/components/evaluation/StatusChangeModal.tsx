import { useState, useEffect, useCallback } from 'react'
import {
  BadgeCheck, PieChart, Archive, CircleDot,
  X, Loader2, CheckCircle,
} from 'lucide-react'
import { getEvaluation, updateEvaluationStatus } from '../../lib/api'
import { parseCurrency, formatCurrencyLive, reaisToCentsStr } from '../../lib/currency'
import { formatCurrency } from '../../lib/utils'
import type { EvaluationStatusType, LifeInsuranceAssessmentResult } from '../../types/api'

// ── Types ─────────────────────────────────────────────────────────

interface CoverageItem {
  key: string
  label: string
  recommended: number
  covered: boolean
  soldAmount: string
}

interface StatusChangeModalProps {
  /** The evaluation id to change status for */
  evaluationId: string
  /** The requested new status */
  initialStatus: EvaluationStatusType
  /** Called after successful status update with the final status and optional notes JSON */
  onConfirmed: (status: EvaluationStatusType, statusNotes?: string) => void
  /** Called when the user cancels */
  onCancel: () => void
}

// ── Constants ─────────────────────────────────────────────────────

const COVERAGE_KEYS: { key: keyof LifeInsuranceAssessmentResult; label: string }[] = [
  { key: 'incomeReplacementAmount', label: 'Reposição de Renda' },
  { key: 'debtClearanceAmount', label: 'Quitação de Dívidas' },
  { key: 'transitionReserveAmount', label: 'Reserva de Transição' },
  { key: 'educationCostsAmount', label: 'Custos de Educação' },
  { key: 'itcmdCostAmount', label: 'ITCMD' },
  { key: 'inventoryCostAmount', label: 'Custos de Inventário' },
]

const STATUS_CONFIG: Record<EvaluationStatusType, {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  btnBg: string
  btnLabel: string
}> = {
  CONVERTIDO: {
    icon: BadgeCheck, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600',
    title: 'Marcar como Convertido',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700', btnLabel: 'Confirmar Conversão',
  },
  CONVERTIDO_PARCIAL: {
    icon: PieChart, iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
    title: 'Conversão Parcial',
    btnBg: 'bg-amber-600 hover:bg-amber-700', btnLabel: 'Confirmar Venda Parcial',
  },
  ARQUIVADO: {
    icon: Archive, iconBg: 'bg-slate-100', iconColor: 'text-slate-500',
    title: 'Arquivar Avaliação',
    btnBg: 'bg-slate-600 hover:bg-slate-700', btnLabel: 'Confirmar Arquivamento',
  },
  ABERTO: {
    icon: CircleDot, iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
    title: 'Reabrir Avaliação',
    btnBg: 'bg-blue-600 hover:bg-blue-700', btnLabel: 'Confirmar Reabertura',
  },
}

// ── Component ─────────────────────────────────────────────────────

export function StatusChangeModal({
  evaluationId,
  initialStatus,
  onConfirmed,
  onCancel,
}: StatusChangeModalProps) {
  const [status, setStatus] = useState<EvaluationStatusType>(initialStatus)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<CoverageItem[]>([])
  const [, setResult] = useState<LifeInsuranceAssessmentResult | null>(null)

  // Load coverage data when status requires it
  const loadCoverageData = useCallback((targetStatus: EvaluationStatusType) => {
    if (targetStatus !== 'CONVERTIDO' && targetStatus !== 'CONVERTIDO_PARCIAL') {
      setItems([])
      setResult(null)
      setLoading(false)
      return
    }
    setLoading(true)
    getEvaluation(evaluationId)
      .then((record) => {
        const r = record.result
        setResult(r)
        setItems(
          COVERAGE_KEYS
            .filter(({ key }) => (r[key] as number) > 0)
            .map(({ key, label }) => ({
              key,
              label,
              recommended: r[key] as number,
              covered: targetStatus === 'CONVERTIDO',
              soldAmount: targetStatus === 'CONVERTIDO' ? reaisToCentsStr(r[key] as number) : '',
            })),
        )
      })
      .catch(() => {
        setItems([])
        setResult(null)
      })
      .finally(() => setLoading(false))
  }, [evaluationId])

  useEffect(() => {
    loadCoverageData(initialStatus)
  }, [initialStatus, loadCoverageData])

  // ── Item handlers ───────────────────────────────────────────────

  function toggleItem(key: string) {
    setItems((prev) =>
      prev.map((it) =>
        it.key === key
          ? { ...it, covered: !it.covered, soldAmount: !it.covered ? reaisToCentsStr(it.recommended) : '' }
          : it,
      ),
    )
  }

  function setAmount(key: string, value: string) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, soldAmount: value } : it)))
  }

  // ── Full conversion detection ───────────────────────────────────

  const isFullConversion =
    status === 'CONVERTIDO_PARCIAL' &&
    items.length > 0 &&
    !loading &&
    items.every((it) => it.covered && parseCurrency(it.soldAmount) >= it.recommended)

  function switchToFullConversion() {
    setStatus('CONVERTIDO')
    setItems((prev) =>
      prev.map((it) => ({ ...it, covered: true, soldAmount: reaisToCentsStr(it.recommended) })),
    )
  }

  // ── Confirm ─────────────────────────────────────────────────────

  async function confirm() {
    let statusNotes: string | undefined
    if ((status === 'CONVERTIDO_PARCIAL' || status === 'CONVERTIDO') && items.length > 0) {
      const coveredItems = items
        .filter((it) => it.covered)
        .map((it) => ({ key: it.key, label: it.label, recommended: it.recommended, sold: parseCurrency(it.soldAmount) }))
      const uncoveredItems = items
        .filter((it) => !it.covered)
        .map((it) => ({ key: it.key, label: it.label, recommended: it.recommended }))
      statusNotes = JSON.stringify({ coveredItems, uncoveredItems })
    }
    try {
      await updateEvaluationStatus(evaluationId, status, statusNotes)
      onConfirmed(status, statusNotes)
    } catch {
      // best-effort
    }
  }

  // ── Derived ─────────────────────────────────────────────────────

  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon

  const confirmDisabled =
    (status === 'CONVERTIDO_PARCIAL' && (loading || items.filter((i) => i.covered).length === 0 || isFullConversion)) ||
    (status === 'CONVERTIDO' && loading)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className={`relative mx-4 w-full rounded-2xl bg-white p-6 shadow-2xl animate-scaleIn ${
          status === 'CONVERTIDO_PARCIAL' ? 'max-w-lg' : 'max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
            <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-800">{cfg.title}</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              <StatusDescription status={status} hasItems={items.length > 0} />
            </p>
          </div>
        </div>

        {/* Partial conversion checklist */}
        {status === 'CONVERTIDO_PARCIAL' && (
          <CoverageChecklist
            loading={loading}
            items={items}
            isFullConversion={isFullConversion}
            onToggle={toggleItem}
            onAmountChange={setAmount}
            onSwitchToFull={switchToFullConversion}
          />
        )}

        {/* Full conversion coverage summary */}
        {status === 'CONVERTIDO' && items.length > 0 && (
          <CoverageSummary loading={loading} items={items} />
        )}

        <p className="mt-3 text-xs text-slate-400">
          Os dados e o hash de auditoria da avaliação permanecem intactos. Você pode alterar o status novamente a qualquer momento.
        </p>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirm}
            disabled={confirmDisabled}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${cfg.btnBg}`}
          >
            {cfg.btnLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function StatusDescription({ status, hasItems }: { status: EvaluationStatusType; hasItems: boolean }) {
  switch (status) {
    case 'CONVERTIDO':
      return hasItems ? (
        <>Confirme abaixo que <span className="font-semibold text-emerald-700">todas as coberturas recomendadas foram contratadas</span>. A venda será registrada como conversão completa e esta avaliação <span className="font-semibold">deixará de contar nas métricas de risco</span>.</>
      ) : (
        <>Ao marcar como <span className="font-semibold text-emerald-700">Convertido</span>, você confirma que a venda foi realizada e o cliente está protegido. Esta avaliação <span className="font-semibold">deixará de contar nas métricas de risco</span> do dashboard e relatórios.</>
      )
    case 'CONVERTIDO_PARCIAL':
      return (
        <>Selecione abaixo <span className="font-semibold text-amber-700">quais coberturas foram vendidas</span> e o valor contratado. As coberturas não marcadas continuarão contando como gap nas métricas de risco.</>
      )
    case 'ARQUIVADO':
      return (
        <>Ao <span className="font-semibold text-slate-700">Arquivar</span>, você indica que o cliente não tem mais interesse ou que o caso foi encerrado sem venda. Esta avaliação <span className="font-semibold">deixará de contar nas métricas de risco</span> do dashboard e relatórios.</>
      )
    case 'ABERTO':
      return (
        <>Ao <span className="font-semibold text-blue-700">Reabrir</span>, esta avaliação voltará a ser contabilizada nas métricas de risco do dashboard e relatórios como um caso ativo.</>
      )
  }
}

function CoverageChecklist({
  loading,
  items,
  isFullConversion,
  onToggle,
  onAmountChange,
  onSwitchToFull,
}: {
  loading: boolean
  items: CoverageItem[]
  isFullConversion: boolean
  onToggle: (key: string) => void
  onAmountChange: (key: string, value: string) => void
  onSwitchToFull: () => void
}) {
  if (loading) {
    return (
      <div className="mt-4 flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando coberturas…
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="mt-4 py-4 text-center text-sm text-slate-400">
        Nenhuma cobertura recomendada encontrada.
      </div>
    )
  }
  return (
    <div className="mt-4">
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.key}
            className={`rounded-xl border p-3 transition-all ${
              item.covered ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={item.covered}
                onChange={() => onToggle(item.key)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                  <span className="text-xs text-slate-400 tabular-nums">
                    Recomendado: {formatCurrency(item.recommended)}
                  </span>
                </div>
                {item.covered && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500 shrink-0">Valor vendido:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatCurrencyLive(item.soldAmount)}
                      onChange={(e) => onAmountChange(item.key, e.target.value.replace(/\D/g, ''))}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm tabular-nums focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                      placeholder="0,00"
                    />
                  </div>
                )}
              </div>
            </label>
          </div>
        ))}
      </div>

      {!isFullConversion && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs">
          <span className="text-amber-700 font-medium">
            {items.filter((i) => i.covered).length} de {items.length} coberturas vendidas
          </span>
          <span className="text-amber-600 font-semibold tabular-nums">
            Total: {formatCurrency(items.filter((i) => i.covered).reduce((sum, i) => sum + parseCurrency(i.soldAmount), 0))}
          </span>
        </div>
      )}

      {isFullConversion && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-start gap-2">
            <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800">
                Todas as coberturas foram selecionadas com os valores recomendados!
              </p>
              <p className="mt-1 text-xs text-emerald-600 leading-relaxed">
                Isso não é uma conversão parcial — é uma <strong>conversão completa</strong>. Deseja marcar como Convertido?
              </p>
              <button
                onClick={onSwitchToFull}
                className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                Marcar como Convertido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CoverageSummary({ loading, items }: { loading: boolean; items: CoverageItem[] }) {
  if (loading) {
    return (
      <div className="mt-4 flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando coberturas…
      </div>
    )
  }
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Coberturas contratadas</p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-slate-700">{item.label}</span>
            </div>
            <span className="text-sm font-semibold text-emerald-700 tabular-nums">
              {formatCurrency(item.recommended)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-100 px-3 py-2 text-xs">
        <span className="text-emerald-700 font-medium">
          {items.length} de {items.length} coberturas
        </span>
        <span className="text-emerald-800 font-semibold tabular-nums">
          Total: {formatCurrency(items.reduce((sum, i) => sum + i.recommended, 0))}
        </span>
      </div>
    </div>
  )
}
