import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Zap, ArrowLeft, CheckCircle, Clock, Loader2, AlertCircle,
  TrendingUp, TrendingDown, Minus, RotateCcw, Copy, Check,
  ShieldCheck, Shield, BarChart3, User, DollarSign, Baby,
  Lightbulb, MessageSquare, Target, HelpCircle, Package, ArrowRight,
  Cigarette, Briefcase, Landmark, GraduationCap, CreditCard, Wallet,
  Info, ChevronDown,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { ScoreRing } from '../components/ui/ScoreRing'
import { GapBar } from '../components/ui/GapBar'
import { Badge } from '../components/ui/Badge'
import { getEvaluation, getEvaluations, getActiveTenantId, updateEvaluationStatus } from '../lib/api'
import {
  actionColors, actionLabel, riskColors, riskLabel, coverageStatusLabel,
  formatCurrency, formatDate, riskScoreColor, evalStatusLabel, evalStatusColors,
} from '../lib/utils'
import type {
  EvaluationRecord, LifeInsuranceAssessmentResult, RecommendedAction,
  BrokerInsight, InsightCategory, EvaluationStatusType,
} from '../types/api'

// ── Explanatory copy ──────────────────────────────────────────────
const ACTION_EXPLANATION: Record<RecommendedAction, string> = {
  AUMENTAR: 'O motor identificou que a cobertura atual do cliente está abaixo do necessário para proteger adequadamente sua família. Recomende o aumento da apólice para cobrir o déficit identificado.',
  MANTER:   'A cobertura atual está bem calibrada para o perfil do cliente. Não há necessidade de ajuste imediato — agende uma revisão periódica para acompanhar mudanças de vida.',
  REDUZIR:  'A cobertura contratada excede a necessidade real calculada. O cliente pode otimizar o valor do prêmio sem comprometer a proteção da família.',
  REVISAR:  'Os dados fornecidos são insuficientes ou apresentam situação atípica. Uma revisão manual com o cliente é necessária antes de qualquer recomendação.',
}

const ACTION_THEME: Record<RecommendedAction, { border: string; bg: string; text: string; iconColor: string; accentBg: string }> = {
  AUMENTAR: { border: 'border-red-200',    bg: 'bg-red-50',    text: 'text-red-800',    iconColor: 'text-red-600',    accentBg: 'bg-red-100/60' },
  MANTER:   { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-800', iconColor: 'text-emerald-600', accentBg: 'bg-emerald-100/60' },
  REDUZIR:  { border: 'border-sky-200',    bg: 'bg-sky-50',    text: 'text-sky-800',    iconColor: 'text-sky-600',    accentBg: 'bg-sky-100/60' },
  REVISAR:  { border: 'border-amber-200',  bg: 'bg-amber-50',  text: 'text-amber-800',  iconColor: 'text-amber-600',  accentBg: 'bg-amber-100/60' },
}

const ACTION_ICONS: Record<RecommendedAction, React.ElementType> = {
  AUMENTAR: TrendingUp,
  MANTER:   Minus,
  REDUZIR:  TrendingDown,
  REVISAR:  RotateCcw,
}

const SCORE_DESCRIPTIONS: Record<string, { title: string; description: string; tip: string }> = {
  protection: {
    title: 'Score de Proteção',
    description: 'Mede o percentual da cobertura necessária que já está coberta pela apólice atual do cliente.',
    tip: '100 = cobertura completa. Abaixo de 30 indica proteção crítica.',
  },
  efficiency: {
    title: 'Score de Eficiência',
    description: 'Avalia se a apólice está bem dimensionada, penalizando tanto subcobertura quanto sobrecobertura.',
    tip: '100 = perfeitamente calibrada. Penaliza excesso ou falta.',
  },
}

type TabId = 'resultado' | 'insights' | 'auditoria'

// ── Main ──────────────────────────────────────────────────────────
export default function EvaluationResult() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [record, setRecord]   = useState<EvaluationRecord | null>(null)
  const [result, setResult]   = useState<LifeInsuranceAssessmentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedHash, setCopiedHash] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('resultado')
  const [previousResult, setPreviousResult] = useState<LifeInsuranceAssessmentResult | null>(null)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  useEffect(() => {
    if (id) {
      getEvaluation(id)
        .then((rec) => { setRecord(rec); setResult(rec.result) })
        .catch(() => setResult(null))
        .finally(() => setLoading(false))
    } else {
      const stored = sessionStorage.getItem('lt_last_result')
      if (stored) setResult(JSON.parse(stored) as LifeInsuranceAssessmentResult)
      setLoading(false)
    }
  }, [id])

  // For triggers: fetch previous evaluation with same consentId
  useEffect(() => {
    if (!record) return
    const isTrigger = record.request.operationalData.recentLifeTrigger
    const consentId = record.request.operationalData.consentId
    if (!isTrigger || !consentId) return

    getEvaluations(getActiveTenantId(), { limit: 200 })
      .then((res) => {
        const sameClient = res.items
          .filter((e) => e.consentId === consentId && e.id !== record.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        const prev = sameClient[0]
        if (prev) {
          getEvaluation(prev.id).then((r) => setPreviousResult(r.result))
        }
      })
      .catch(() => { /* best-effort */ })
  }, [record])

  function copyHash(hash: string) {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedHash(true)
      setTimeout(() => setCopiedHash(false), 1500)
    })
  }

  async function handleStatusChange(newStatus: EvaluationStatusType) {
    if (!record || !id) return
    setShowStatusMenu(false)
    try {
      await updateEvaluationStatus(id, newStatus)
      setRecord({ ...record, status: newStatus })
    } catch { /* best-effort */ }
  }

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        <span className="text-sm">Carregando resultado...</span>
      </div>
    )
  }

  // ── Not found ─────────────────────────────────────────────────
  if (!result) {
    return (
      <div>
        <TopBar title="Resultado da Avaliação" subtitle="Avaliação não encontrada" />
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <AlertCircle className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">Resultado não encontrado</p>
          <p className="text-xs text-slate-400 text-center max-w-xs">
            O ID pode ser inválido ou esta avaliação pertence a outro tenant.
          </p>
          <button
            onClick={() => navigate('/evaluations/new')}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Nova Avaliação
          </button>
        </div>
      </div>
    )
  }

  const actionTheme = ACTION_THEME[result.recommendedAction]
  const ActionIcon  = ACTION_ICONS[result.recommendedAction]
  const req = record?.request
  const insightCount = result.brokerInsights?.length ?? 0

  return (
    <div>
      <TopBar
        title="Resultado da Avaliação"
        subtitle={record?.request.operationalData.recentLifeTrigger ? 'Gatilho de Vida' : undefined}
      />

      <div className="animate-fadeIn p-4 sm:p-6 space-y-4 sm:space-y-5">

        {/* Back + ID */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <div className="flex items-center gap-2">
            {record && (
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${evalStatusColors((record.status || 'ABERTO') as EvaluationStatusType)}`}
                >
                  {evalStatusLabel((record.status || 'ABERTO') as EvaluationStatusType)}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showStatusMenu && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                    {(['ABERTO', 'CONVERTIDO', 'CONVERTIDO_PARCIAL', 'ARQUIVADO'] as EvaluationStatusType[])
                      .filter((s) => s !== (record.status || 'ABERTO'))
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleStatusChange(s)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <span className={`inline-block h-2 w-2 rounded-full ${
                            s === 'CONVERTIDO' ? 'bg-emerald-500'
                            : s === 'CONVERTIDO_PARCIAL' ? 'bg-amber-500'
                            : s === 'ARQUIVADO' ? 'bg-slate-400'
                            : 'bg-blue-500'
                          }`} />
                          {evalStatusLabel(s)}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
            {id && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(id)
                  setCopiedId(true)
                  setTimeout(() => setCopiedId(false), 1500)
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 transition-colors"
                title="Copiar ID completo"
              >
                <span className="font-mono text-[11px] text-slate-600 hidden sm:inline">{id}</span>
                <span className="font-mono text-[11px] text-slate-600 sm:hidden">{id.slice(0, 12)}…</span>
                {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* ── Diagnosis / recommendation card — always visible ── */}
        <div className={`rounded-2xl border p-5 sm:p-6 shadow-card ${actionTheme.border} ${actionTheme.bg}`}>
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${actionTheme.accentBg}`}>
              <ActionIcon className={`h-6 w-6 ${actionTheme.iconColor}`} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className={`${riskColors(result.riskClassification)}`} size="md">
                  {riskLabel(result.riskClassification)}
                </Badge>
                <Badge className={`${actionColors(result.recommendedAction)}`} size="md">
                  {actionLabel(result.recommendedAction)} Cobertura
                </Badge>
                {result.audit?.timestamp && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(result.audit.timestamp)}
                  </span>
                )}
              </div>
              <p className={`text-sm leading-relaxed ${actionTheme.text}`}>
                {ACTION_EXPLANATION[result.recommendedAction]}
              </p>
            </div>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1">
          <TabButton id="resultado" active={activeTab} label="Resultado" onClick={setActiveTab} />
          <TabButton
            id="insights"
            active={activeTab}
            label="Insights"
            badge={insightCount > 0 ? insightCount : undefined}
            onClick={setActiveTab}
          />
          <TabButton id="auditoria" active={activeTab} label="Auditoria" onClick={setActiveTab} />
        </div>

        {/* ── Tab: Resultado ── */}
        {activeTab === 'resultado' && (
          <div className="space-y-5">

            {/* 1. Overview — Score rings side by side */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-card">
              <div className="mb-5">
                <h2 className="text-base font-bold text-slate-900">Visão Geral</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Resumo dos principais indicadores calculados pelo motor de avaliação.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Protection Score */}
                <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-5">
                  <ScoreRing score={result.protectionScore} size={100} strokeWidth={8} />
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-900">Proteção</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Quanto da necessidade está coberta</p>
                  </div>
                </div>
                {/* Efficiency Score */}
                <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-5">
                  <ScoreRing score={result.coverageEfficiencyScore} size={100} strokeWidth={8} />
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-900">Eficiência</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Calibragem da apólice atual</p>
                  </div>
                </div>
                {/* Gap Summary */}
                <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-5">
                  <div className="flex h-[100px] w-[100px] items-center justify-center">
                    <div className="text-center">
                      <p className={`text-3xl font-extrabold tabular-nums ${result.protectionGapPercentage > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {Math.abs(result.protectionGapPercentage).toFixed(0)}%
                      </p>
                      <p className={`text-xs font-semibold ${result.protectionGapPercentage > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {result.protectionGapPercentage > 0 ? 'Déficit' : result.protectionGapPercentage < 0 ? 'Excedente' : 'Alinhado'}
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-900">Gap de Cobertura</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{formatCurrency(Math.abs(result.protectionGapAmount))}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 1b. Trigger comparison — before vs after */}
            {record?.request.operationalData.recentLifeTrigger && previousResult && (
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-5 sm:p-6 shadow-card">
                <div className="mb-5 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-600" />
                  <div>
                    <h2 className="text-base font-bold text-amber-900">Impacto do Gatilho de Vida</h2>
                    <p className="mt-0.5 text-xs text-amber-700">
                      Comparação entre a avaliação anterior e o resultado após o evento de vida.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    { label: 'Cobertura Recomendada', prev: previousResult.recommendedCoverageAmount, curr: result.recommendedCoverageAmount, fmt: 'currency' as const },
                    { label: 'Score de Proteção', prev: previousResult.protectionScore, curr: result.protectionScore, fmt: 'pct' as const },
                    { label: 'Score de Eficiência', prev: previousResult.coverageEfficiencyScore, curr: result.coverageEfficiencyScore, fmt: 'pct' as const },
                    { label: 'Gap de Cobertura', prev: previousResult.protectionGapPercentage, curr: result.protectionGapPercentage, fmt: 'gap' as const },
                  ]).map((item) => {
                    const diff = item.curr - item.prev
                    const improved = item.fmt === 'gap' ? diff <= 0 : diff >= 0
                    return (
                      <div key={item.label} className="rounded-xl border border-amber-100 bg-white p-3 space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">{item.label}</p>
                        <div className="flex items-end justify-between gap-1">
                          <div>
                            <p className="text-[10px] text-slate-400">Antes</p>
                            <p className="text-xs font-semibold text-slate-500 tabular-nums">
                              {item.fmt === 'currency' ? formatCurrency(item.prev) : `${item.prev.toFixed(0)}%`}
                            </p>
                          </div>
                          <ArrowRight className="h-3 w-3 text-slate-300 shrink-0 mb-0.5" />
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400">Depois</p>
                            <p className="text-xs font-bold text-slate-900 tabular-nums">
                              {item.fmt === 'currency' ? formatCurrency(item.curr) : `${item.curr.toFixed(0)}%`}
                            </p>
                          </div>
                        </div>
                        {diff !== 0 && (
                          <p className={`text-[10px] font-semibold tabular-nums ${improved ? 'text-emerald-600' : 'text-red-600'}`}>
                            {diff > 0 ? '+' : ''}{item.fmt === 'currency' ? formatCurrency(diff) : `${diff.toFixed(0)}%`}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 2. Coverage gap — detailed */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-card">
              <div className="mb-5">
                <h2 className="text-base font-bold text-slate-900">Cobertura vs. Necessidade</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  O motor calcula o capital necessário para proteger a família com base em renda, dependentes, dívidas e patrimônio.
                  Abaixo, a comparação entre o que o cliente já tem contratado e o que deveria ter.
                </p>
              </div>
              <GapBar
                current={result.currentCoverageAmount}
                recommended={result.recommendedCoverageAmount}
              />
              {/* Coverage ratio */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                <span className="text-xs font-medium text-slate-500">Cobertura contratada representa</span>
                <span className={`text-sm font-bold tabular-nums ${riskScoreColor(result.protectionScore)}`}>
                  {result.recommendedCoverageAmount > 0
                    ? `${((result.currentCoverageAmount / result.recommendedCoverageAmount) * 100).toFixed(0)}%`
                    : '—'
                  } da necessidade
                </span>
              </div>
            </div>

            {/* 3. Scores — detailed with segmented bars */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-card">
              <div className="mb-5">
                <h2 className="text-base font-bold text-slate-900">Análise Detalhada dos Scores</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Cada score é calculado com base no perfil financeiro, familiar e no histórico do cliente.
                </p>
              </div>
              {/* Scale legend */}
              <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-bold text-slate-500 shrink-0">Como ler a escala:</p>
                <div className="flex flex-wrap items-center gap-3">
                  <ScalePill range="0 – 29"   hint="Crítico"  colorClass="bg-red-500" />
                  <ScalePill range="30 – 69"  hint="Moderado" colorClass="bg-amber-500" />
                  <ScalePill range="70 – 100" hint="Adequado" colorClass="bg-emerald-500" />
                </div>
              </div>
              <div className="space-y-4">
                <ScoreRow
                  score={result.protectionScore}
                  meta={SCORE_DESCRIPTIONS.protection}
                />
                <ScoreRow
                  score={result.coverageEfficiencyScore}
                  meta={SCORE_DESCRIPTIONS.efficiency}
                />
              </div>
            </div>

            {/* 4. Coverage breakdown */}
            {result.recommendedCoverageAmount > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-card">
                <div className="mb-5">
                  <h2 className="text-base font-bold text-slate-900">Composição da Cobertura Recomendada</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Cada componente representa uma necessidade específica identificada pelo motor.
                    O valor total é a soma de todas as proteções necessárias.
                  </p>
                </div>

                {/* Stacked bar */}
                <StackedCoverageBar result={result} />

                {/* Individual breakdowns */}
                <div className="mt-5 space-y-3">
                  {COVERAGE_ITEMS
                    .map((item) => ({ ...item, value: item.getValue(result) }))
                    .filter((item) => item.value > 0)
                    .map((item) => {
                      const pct = (item.value / result.recommendedCoverageAmount) * 100
                      return (
                        <div key={item.label} className="group">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`h-3 w-3 rounded-sm ${item.color}`} />
                              <span className="text-sm font-medium text-slate-700">{item.label}</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-sm font-bold tabular-nums text-slate-800">
                                {formatCurrency(item.value)}
                              </span>
                              <span className="text-xs tabular-nums text-slate-400">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${item.color} transition-all duration-700 ease-out`}
                              style={{ width: `${Math.max(pct, 1.5)}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">{item.explanation}</p>
                        </div>
                      )
                    })}
                </div>

                {/* Total */}
                <div className="mt-4 flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
                  <span className="text-sm font-bold text-brand-800">Capital Segurado Recomendado</span>
                  <span className="text-base font-extrabold tabular-nums text-brand-700">
                    {formatCurrency(result.recommendedCoverageAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* 5. Justifications */}
            {result.justificationsRendered?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-card">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-slate-900">Justificativas do Cálculo</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Regras e critérios aplicados pelo motor que influenciaram diretamente o resultado desta avaliação.
                  </p>
                </div>
                <ul className="space-y-2">
                  {result.justificationsRendered.map((text, i) => (
                    <li key={i} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      <span className="text-sm leading-relaxed text-slate-700">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 6. Client context */}
            {req && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-card">
                <div className="mb-5">
                  <h2 className="text-base font-bold text-slate-900">Dados do Cliente Avaliado</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Perfil completo utilizado pelo motor para calcular a necessidade de proteção. Qualquer alteração nestes dados pode gerar um resultado diferente.
                  </p>
                </div>

                {/* Primary data */}
                <SectionLabel label="Perfil Pessoal" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                  <ContextCard icon={User} label="Idade" value={`${req.personalContext.age} anos`} />
                  <ContextCard icon={Baby} label="Dependentes" value={`${req.familyContext.dependentsCount}`} />
                  <ContextCard icon={Briefcase} label="Risco profissional" value={req.personalContext.professionRiskLevel} />
                  <ContextCard icon={Cigarette} label="Fumante" value={req.personalContext.isSmoker ? 'Sim' : 'Não'} />
                </div>

                {/* Financial data */}
                <SectionLabel label="Contexto Financeiro" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                  <ContextCard
                    icon={DollarSign}
                    label="Renda mensal"
                    value={req.financialContext.monthlyIncome.exactValue != null
                      ? formatCurrency(req.financialContext.monthlyIncome.exactValue)
                      : req.financialContext.monthlyIncome.bracket ?? 'N/D'
                    }
                  />
                  <ContextCard
                    icon={ShieldCheck}
                    label="Cobertura atual"
                    value={(() => {
                      const pols = req.financialContext.policies
                      if (pols && pols.length > 0) {
                        const total = pols.reduce((s, p) => s + (p.coverageAmount ?? 0), 0)
                        return total > 0 ? `${formatCurrency(total)} (${pols.length} apólice${pols.length > 1 ? 's' : ''})` : 'Sem apólice'
                      }
                      return req.financialContext.currentLifeInsurance?.coverageAmount != null
                        ? formatCurrency(req.financialContext.currentLifeInsurance.coverageAmount)
                        : 'Sem apólice'
                    })()}
                  />
                  <ContextCard
                    icon={CreditCard}
                    label="Dívidas"
                    value={req.financialContext.debts?.totalAmount
                      ? formatCurrency(req.financialContext.debts.totalAmount)
                      : 'Sem dívidas'}
                  />
                  <ContextCard
                    icon={Wallet}
                    label="Reserva emergência"
                    value={req.financialContext.emergencyFundMonths != null
                      ? `${req.financialContext.emergencyFundMonths} meses`
                      : 'Não informado'}
                  />
                  {req.financialContext.educationCosts?.totalEstimatedCost != null &&
                    req.financialContext.educationCosts.totalEstimatedCost > 0 && (
                    <ContextCard
                      icon={GraduationCap}
                      label="Custos educação"
                      value={formatCurrency(req.financialContext.educationCosts.totalEstimatedCost)}
                    />
                  )}
                  {req.financialContext.estate?.totalEstateValue != null &&
                    req.financialContext.estate.totalEstateValue > 0 && (
                    <ContextCard
                      icon={Landmark}
                      label="Patrimônio"
                      value={`${formatCurrency(req.financialContext.estate.totalEstateValue)}${req.financialContext.estate.state ? ` (${req.financialContext.estate.state})` : ''}`}
                    />
                  )}
                </div>

                {/* Operational */}
                <SectionLabel label="Operacional" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <ContextCard icon={BarChart3} label="Canal de origem" value={req.operationalData.originChannel} />
                  <ContextCard icon={Shield} label="Consentimento" value={req.operationalData.hasExplicitActiveConsent ? 'Ativo' : 'Pendente'} />
                </div>
              </div>
            )}

            {/* 7. CTA — Trigger */}
            {record && (
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-5 sm:p-6 shadow-card">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                      <Zap className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">Houve mudança na vida do cliente?</p>
                      <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                        Casamento, nascimento de filho, compra de imóvel, promoção ou aposentadoria —
                        registre um gatilho de vida para recalcular a proteção com os dados já preenchidos.
                        O motor compara automaticamente o antes e o depois.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/triggers/new', { state: { prefill: record.request } })}
                    className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-amber-600 transition-colors shrink-0"
                  >
                    <Zap className="h-4 w-4" />
                    Registrar Gatilho
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Insights ── */}
        {activeTab === 'insights' && (
          <div className="space-y-5">
            {insightCount > 0 ? (
              <div className="rounded-2xl border border-brand-200 bg-gradient-to-b from-brand-50 to-white p-5 sm:p-6 shadow-card">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100">
                    <Lightbulb className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-brand-900">Insights para o Corretor</h2>
                    <p className="mt-0.5 text-xs text-brand-600">
                      Sugestões de abordagem personalizadas para este perfil específico,
                      geradas pelo motor com base no gap, risco e contexto do cliente.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {result.brokerInsights.map((insight, i) => (
                    <InsightCard key={i} insight={insight} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16">
                <Lightbulb className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-semibold text-slate-500">Nenhum insight disponível</p>
                <p className="text-xs text-slate-400">Esta avaliação não gerou insights de abordagem.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Auditoria ── */}
        {activeTab === 'auditoria' && (
          <div className="space-y-5">
            {result.audit && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-card">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Metadados de Auditoria</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Rastreabilidade técnica desta avaliação — versão do motor e regras utilizadas.
                    </p>
                  </div>
                  {id && (
                    <button
                      onClick={() => navigate('/audit')}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
                      Verificar Integridade
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  <AuditRow label="Versão do Motor"   value={result.audit.engineVersion} />
                  <AuditRow label="Versão do Ruleset" value={result.audit.ruleSetVersion} />
                  <AuditRow label="Consent ID"        value={result.audit.consentId} />
                </div>

                {record?.auditHash && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 mb-4">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Audit Hash SHA-256
                      </p>
                      <button
                        onClick={() => copyHash(record.auditHash!)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {copiedHash
                          ? <><Check className="h-3 w-3 text-emerald-500" /> Copiado!</>
                          : <><Copy className="h-3 w-3" /> Copiar</>
                        }
                      </button>
                    </div>
                    <p className="break-all font-mono text-xs text-slate-700">{record.auditHash}</p>
                  </div>
                )}

                {result.audit.appliedRules?.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Regras Aplicadas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.audit.appliedRules.map((r) => (
                        <span
                          key={r}
                          className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[10px] text-slate-600"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ── TabButton ─────────────────────────────────────────────────────
function TabButton({
  id, active, label, badge, onClick,
}: {
  id: TabId
  active: TabId
  label: string
  badge?: number
  onClick: (id: TabId) => void
}) {
  const isActive = id === active
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`
        flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all
        ${isActive
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
        }
      `}
    >
      {label}
      {badge !== undefined && (
        <span className={`
          flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold
          ${isActive ? 'bg-brand-600 text-white' : 'bg-slate-300 text-slate-600'}
        `}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ── Sub-components ────────────────────────────────────────────────

// ── Coverage items config ─────────────────────────────────────────
const COVERAGE_ITEMS = [
  {
    label: 'Substituição de Renda',
    color: 'bg-brand-500',
    explanation: 'Capital necessário para manter a renda familiar durante o período de transição.',
    getValue: (r: LifeInsuranceAssessmentResult) => r.incomeReplacementAmount,
  },
  {
    label: 'Quitação de Dívidas',
    color: 'bg-amber-500',
    explanation: 'Valor para liquidar todas as dívidas pendentes em caso de sinistro.',
    getValue: (r: LifeInsuranceAssessmentResult) => r.debtClearanceAmount,
  },
  {
    label: 'Reserva de Transição',
    color: 'bg-sky-500',
    explanation: 'Colchão financeiro para despesas imediatas e reorganização familiar.',
    getValue: (r: LifeInsuranceAssessmentResult) => r.transitionReserveAmount,
  },
  {
    label: 'Custos de Educação',
    color: 'bg-violet-500',
    explanation: 'Proteção para garantir a educação dos dependentes até a fase adulta.',
    getValue: (r: LifeInsuranceAssessmentResult) => r.educationCostsAmount,
  },
  {
    label: 'ITCMD (Imposto Herança)',
    color: 'bg-orange-500',
    explanation: 'Imposto estadual sobre transmissão de bens que incide sobre o patrimônio.',
    getValue: (r: LifeInsuranceAssessmentResult) => r.itcmdCostAmount,
  },
  {
    label: 'Custos de Inventário',
    color: 'bg-rose-500',
    explanation: 'Despesas legais e cartárias para o processo de inventário.',
    getValue: (r: LifeInsuranceAssessmentResult) => r.inventoryCostAmount,
  },
]

// ── Stacked coverage bar ──────────────────────────────────────────
function StackedCoverageBar({ result }: { result: LifeInsuranceAssessmentResult }) {
  const items = COVERAGE_ITEMS
    .map((item) => ({ ...item, value: item.getValue(result) }))
    .filter((item) => item.value > 0)

  const total = result.recommendedCoverageAmount
  if (total <= 0) return null

  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
        {items.map((item, i) => {
          const pct = (item.value / total) * 100
          return (
            <div
              key={item.label}
              className={`h-full ${item.color} transition-all duration-700 ${i === 0 ? 'rounded-l-full' : ''} ${i === items.length - 1 ? 'rounded-r-full' : ''}`}
              style={{ width: `${pct}%` }}
              title={`${item.label}: ${formatCurrency(item.value)} (${pct.toFixed(1)}%)`}
            />
          )
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />
            <span className="text-[11px] text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Score row with segmented bar ──────────────────────────────────
function ScoreRow({
  score,
  meta,
}: {
  score: number
  meta: { title: string; description: string; tip: string }
}) {
  const scoreColor = score < 30 ? 'text-red-600' : score < 70 ? 'text-amber-600' : 'text-emerald-600'
  const barColor = score < 30 ? 'from-red-400 to-red-500' : score < 70 ? 'from-amber-400 to-amber-500' : 'from-emerald-400 to-emerald-500'
  const scoreLabel = score < 30 ? 'Crítico' : score < 70 ? 'Moderado' : 'Adequado'
  const scoreBadge = score < 30 ? 'bg-red-100 text-red-700' : score < 70 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="text-sm font-bold text-slate-900">{meta.title}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreBadge}`}>
              {scoreLabel}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">{meta.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-2xl font-extrabold tabular-nums leading-none ${scoreColor}`}>
            {score}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">de 100</p>
        </div>
      </div>

      {/* Segmented progress bar */}
      <div className="relative">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
            style={{ width: `${score}%` }}
          />
        </div>
        {/* Scale markers */}
        <div className="absolute inset-0 flex h-3 items-center">
          <div className="absolute left-[30%] h-3 w-px bg-slate-300/60" />
          <div className="absolute left-[70%] h-3 w-px bg-slate-300/60" />
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>0</span>
        <span>30</span>
        <span>70</span>
        <span>100</span>
      </div>

      {/* Tip */}
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-white border border-slate-100 px-3 py-2">
        <Info className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
        <p className="text-[11px] text-slate-500 leading-relaxed">{meta.tip}</p>
      </div>
    </div>
  )
}

// ── Insight card ─────────────────────────────────────────────────

const INSIGHT_META: Record<InsightCategory, {
  label: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  borderColor: string
  badgeBg: string
  badgeText: string
}> = {
  ABERTURA: {
    label: 'Abertura',
    icon: MessageSquare,
    iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
    borderColor: 'border-blue-100', badgeBg: 'bg-blue-50', badgeText: 'text-blue-700',
  },
  ARGUMENTO_PRINCIPAL: {
    label: 'Argumento Principal',
    icon: Target,
    iconBg: 'bg-violet-50', iconColor: 'text-violet-600',
    borderColor: 'border-violet-100', badgeBg: 'bg-violet-50', badgeText: 'text-violet-700',
  },
  OBJECAO_PREVISTA: {
    label: 'Objeção Prevista',
    icon: HelpCircle,
    iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
    borderColor: 'border-amber-100', badgeBg: 'bg-amber-50', badgeText: 'text-amber-700',
  },
  PRODUTO_SUGERIDO: {
    label: 'Produto Sugerido',
    icon: Package,
    iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-100', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700',
  },
  PROXIMO_PASSO: {
    label: 'Próximo Passo',
    icon: ArrowRight,
    iconBg: 'bg-brand-50', iconColor: 'text-brand-600',
    borderColor: 'border-brand-100', badgeBg: 'bg-brand-50', badgeText: 'text-brand-700',
  },
}

const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  ALTA:  { label: 'Prioridade Alta',  className: 'bg-red-100 text-red-700' },
  MEDIA: { label: 'Prioridade Média', className: 'bg-amber-100 text-amber-700' },
  BAIXA: { label: 'Prioridade Baixa', className: 'bg-slate-100 text-slate-600' },
}

function InsightCard({ insight }: { insight: BrokerInsight }) {
  const [open, setOpen] = React.useState(true)
  const meta     = INSIGHT_META[insight.category]
  const priority = PRIORITY_BADGE[insight.priority]
  const Icon = meta.icon

  return (
    <div className={`rounded-xl border bg-white ${meta.borderColor}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.iconBg}`}>
          <Icon className={`h-4 w-4 ${meta.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badgeBg} ${meta.badgeText}`}>
              {meta.label}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priority.className}`}>
              {priority.label}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-slate-800">{insight.headline}</p>
        </div>
        <span className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
          <ArrowRight className="h-4 w-4" />
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{insight.body}</p>
        </div>
      )}
    </div>
  )
}

function ScalePill({ range, hint, colorClass }: { range: string; hint: string; colorClass: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
      <span className="text-[11px] font-medium text-slate-600">{range}</span>
      <span className="text-[11px] text-slate-400">{hint}</span>
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
  )
}

function ContextCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      </div>
      <p className="truncate text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}

function AuditRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}
