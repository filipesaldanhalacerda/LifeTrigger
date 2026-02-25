import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Zap, ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { ScoreRing } from '../components/ui/ScoreRing'
import { GapBar } from '../components/ui/GapBar'
import { Badge } from '../components/ui/Badge'
import { getEvaluation } from '../lib/api'
import {
  actionColors, actionLabel, riskColors, riskLabel, coverageStatusLabel,
  formatCurrency, formatDate, riskScoreColor,
} from '../lib/utils'
import type { LifeInsuranceAssessmentResult } from '../types/api'

export default function EvaluationResult() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [result, setResult] = useState<LifeInsuranceAssessmentResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      // Loading from history
      getEvaluation(id)
        .then((rec) => setResult(rec.result))
        .catch(() => setResult(null))
        .finally(() => setLoading(false))
    } else {
      // From new evaluation
      const stored = sessionStorage.getItem('lt_last_result')
      if (stored) {
        setResult(JSON.parse(stored) as LifeInsuranceAssessmentResult)
      }
      setLoading(false)
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-500">Carregando resultado…</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-slate-500">Nenhum resultado encontrado.</p>
        <button onClick={() => navigate('/evaluations/new')} className="text-sm text-indigo-600">
          Fazer nova avaliação
        </button>
      </div>
    )
  }

  return (
    <div>
      <TopBar
        title="Resultado da Avaliação"
        subtitle={id ? `ID: ${id}` : 'Avaliação recém-gerada'}
      />

      <div className="p-6 space-y-5">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        {/* Hero */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-start gap-8">
            {/* Scores */}
            <div className="flex gap-8">
              <div className="text-center">
                <ScoreRing score={result.protectionScore} label="Protection Score" />
              </div>
              <div className="text-center">
                <ScoreRing score={result.coverageEfficiencyScore} label="Efficiency Score" />
              </div>
            </div>

            {/* Classification */}
            <div className="flex flex-col gap-3 flex-1 min-w-52">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Classificação de Risco
                </p>
                <Badge className={`${riskColors(result.riskClassification)} text-base`} size="lg">
                  {riskLabel(result.riskClassification)}
                </Badge>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Ação Recomendada
                </p>
                <Badge className={`${actionColors(result.recommendedAction)} text-base`} size="lg">
                  {actionLabel(result.recommendedAction)}
                </Badge>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status de Cobertura
                </p>
                <p className="text-sm font-medium text-slate-700">
                  {coverageStatusLabel(result.coverageStatus)}
                </p>
              </div>
              {result.audit?.timestamp && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(result.audit.timestamp)}
                </div>
              )}
            </div>

            {/* Register trigger CTA */}
            <button
              onClick={() => navigate('/triggers/new')}
              className="flex items-center gap-2 self-start rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors"
            >
              <Zap className="h-4 w-4" />
              Registrar Gatilho de Vida
            </button>
          </div>
        </div>

        {/* Coverage gap */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="mb-5 text-sm font-semibold text-slate-900">Cobertura vs. Necessidade</h2>
          <GapBar
            current={result.currentCoverageAmount}
            recommended={result.recommendedCoverageAmount}
          />
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ScoreStat label="Protection Score" value={result.protectionScore} colorFn={riskScoreColor} />
          <ScoreStat label="Efficiency Score" value={result.coverageEfficiencyScore} colorFn={riskScoreColor} />
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Gap (R$)</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {formatCurrency(Math.abs(result.protectionGapAmount))}
            </p>
            <p className="text-xs text-slate-400">
              {result.protectionGapAmount < 0 ? 'excedente' : 'déficit'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Gap (%)</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {Math.abs(result.protectionGapPercentage).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400">
              {result.protectionGapPercentage > 0 ? 'subprotegido' : 'sobresegurado'}
            </p>
          </div>
        </div>

        {/* Justifications */}
        {result.justificationsRendered?.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Justificativas do Cálculo</h2>
            <ul className="space-y-2.5">
              {result.justificationsRendered.map((text, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                  <span className="text-sm text-slate-700">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Audit */}
        {result.audit && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Metadados de Auditoria</h2>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <AuditRow label="Engine" value={result.audit.engineVersion} />
              <AuditRow label="Ruleset" value={result.audit.ruleSetVersion} />
              <AuditRow label="Consent ID" value={result.audit.consentId} />
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-slate-500">Ruleset Hash</p>
                <p className="font-mono text-xs text-slate-700 break-all">{result.audit.ruleSetHash}</p>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <p className="mb-1 text-xs text-slate-500">Regras Aplicadas</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.audit.appliedRules?.map((r) => (
                    <span key={r} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreStat({ label, value, colorFn }: { label: string; value: number; colorFn: (v: number) => string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${colorFn(value)}`}>{value}</p>
      <p className="text-xs text-slate-400">/ 100</p>
    </div>
  )
}

function AuditRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  )
}

// Suppress unused import warning
const _xc = XCircle
void _xc
