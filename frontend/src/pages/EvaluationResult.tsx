import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Zap, ArrowLeft, CheckCircle, Clock, Loader2, AlertCircle,
  TrendingUp, TrendingDown, Minus, RotateCcw, Copy, Check,
  ShieldCheck, Shield, BarChart3, User, DollarSign, Baby,
  Lightbulb, MessageSquare, Target, HelpCircle, Package, ArrowRight,
  Cigarette, Briefcase, Landmark, GraduationCap, CreditCard, Wallet,
  Info, ChevronDown, BadgeCheck, CircleDot, Archive, PieChart,
  Activity, FileText, Hash,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { GapBar } from '../components/ui/GapBar'
import { getEvaluation, getEvaluations, getActiveTenantId } from '../lib/api'
import { StatusChangeModal } from '../components/evaluation/StatusChangeModal'
import {
  actionLabel, riskLabel,
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
  const [confirmAction, setConfirmAction] = useState<{ status: EvaluationStatusType } | null>(null)

  useEffect(() => {
    if (id) {
      getEvaluation(id)
        .then((rec) => { setRecord(rec); setResult(rec.result) })
        .catch(() => setResult(null))
        .finally(() => setLoading(false))
    } else {
      const stored = sessionStorage.getItem('lt_last_result')
      if (stored) {
        try { setResult(JSON.parse(stored) as LifeInsuranceAssessmentResult) }
        catch { /* corrupted sessionStorage — ignore */ }
      }
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

  const copyHashTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  function copyHash(hash: string) {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedHash(true)
      if (copyHashTimer.current) clearTimeout(copyHashTimer.current)
      copyHashTimer.current = setTimeout(() => setCopiedHash(false), 1500)
    })
  }
  React.useEffect(() => () => { if (copyHashTimer.current) clearTimeout(copyHashTimer.current) }, [])

  function requestStatusChange(newStatus: EvaluationStatusType) {
    if (!record || !id || !result) return
    setShowStatusMenu(false)
    setConfirmAction({ status: newStatus })
  }

  function handleStatusConfirmed(finalStatus: EvaluationStatusType, statusNotes?: string) {
    if (!record) return
    setRecord({ ...record, status: finalStatus, statusNotes })
    setConfirmAction(null)
  }

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        <span className="text-sm font-medium tracking-wide">Carregando resultado...</span>
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
            className="rounded-sm bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Nova Avaliação
          </button>
        </div>
      </div>
    )
  }

  const ActionIcon  = ACTION_ICONS[result.recommendedAction]
  const req = record?.request
  const insightCount = result.brokerInsights?.length ?? 0
  const scoreStatus = (s: number) => s < 30 ? 'Crítico' : s < 70 ? 'Moderado' : 'Adequado'
  const scoreStatusBadge = (s: number) => s < 30 ? 'bg-red-100 text-red-700' : s < 70 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'

  return (
    <div>
      <TopBar
        title="Resultado da Avaliação"
        subtitle={record?.request.operationalData.recentLifeTrigger ? 'Gatilho de Vida' : undefined}
      />

      <div className="p-4 lg:p-5 space-y-4">

        {/* ═══ HEADER: Back + ID + Status ═══ */}
        <div className="flex items-center justify-between gap-3 reveal-up">
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
                  className={`inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors ${evalStatusColors((record.status || 'ABERTO') as EvaluationStatusType)}`}
                >
                  {evalStatusLabel((record.status || 'ABERTO') as EvaluationStatusType)}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showStatusMenu && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-sm border border-slate-200 bg-white shadow-xl py-1.5">
                    {(['ABERTO', 'CONVERTIDO', 'CONVERTIDO_PARCIAL', 'ARQUIVADO'] as EvaluationStatusType[])
                      .filter((s) => s !== (record.status || 'ABERTO'))
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => requestStatusChange(s)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          {s === 'CONVERTIDO' && <BadgeCheck className="h-4 w-4 text-emerald-500" />}
                          {s === 'CONVERTIDO_PARCIAL' && <PieChart className="h-4 w-4 text-amber-500" />}
                          {s === 'ARQUIVADO' && <Archive className="h-4 w-4 text-slate-400" />}
                          {s === 'ABERTO' && <CircleDot className="h-4 w-4 text-blue-500" />}
                          <div className="text-left">
                            <p className="font-semibold">{evalStatusLabel(s)}</p>
                            <p className="text-[10px] text-slate-400 font-normal">
                              {s === 'CONVERTIDO' && 'Venda realizada'}
                              {s === 'CONVERTIDO_PARCIAL' && 'Venda parcial com gap'}
                              {s === 'ARQUIVADO' && 'Sem interesse'}
                              {s === 'ABERTO' && 'Reabrir caso'}
                            </p>
                          </div>
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
                className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 transition-colors"
                title="Copiar ID completo"
              >
                <span className="font-mono text-[11px] text-slate-600 hidden sm:inline">{id}</span>
                <span className="font-mono text-[11px] text-slate-600 sm:hidden">{id.slice(0, 12)}…</span>
                {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* ═══ HERO: Diagnosis summary ═══ */}
        <div className={`box border-l-4 ${
          result.recommendedAction === 'AUMENTAR' ? 'border-l-red-300' :
          result.recommendedAction === 'MANTER' ? 'border-l-emerald-300' :
          result.recommendedAction === 'REDUZIR' ? 'border-l-sky-300' :
          'border-l-amber-300'
        }`}>
          <div className="px-4 py-3">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm ${
                result.recommendedAction === 'AUMENTAR' ? 'bg-red-100' :
                result.recommendedAction === 'MANTER' ? 'bg-emerald-100' :
                result.recommendedAction === 'REDUZIR' ? 'bg-sky-100' :
                'bg-amber-100'
              }`}>
                <ActionIcon className={`h-5 w-5 ${
                  result.recommendedAction === 'AUMENTAR' ? 'text-red-600' :
                  result.recommendedAction === 'MANTER' ? 'text-emerald-600' :
                  result.recommendedAction === 'REDUZIR' ? 'text-sky-600' :
                  'text-amber-600'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-bold ${
                    result.recommendedAction === 'AUMENTAR' ? 'bg-red-50 text-red-700' :
                    result.recommendedAction === 'MANTER' ? 'bg-emerald-50 text-emerald-700' :
                    result.recommendedAction === 'REDUZIR' ? 'bg-sky-50 text-sky-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {actionLabel(result.recommendedAction)} Cobertura
                  </span>
                  <span className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {riskLabel(result.riskClassification)}
                  </span>
                  {result.audit?.timestamp && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      {formatDate(result.audit.timestamp)}
                    </span>
                  )}
                </div>
                <p className="text-[13px] leading-relaxed text-slate-600">
                  {ACTION_EXPLANATION[result.recommendedAction]}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ METRIC STRIP: 4 stat cards ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Protection Score */}
          <div className="box animate-fadeIn">
            <div className="px-4 py-3">
              <div className="flex items-start justify-between gap-1">
                <p className="text-[12px] font-medium text-slate-500">Proteção</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreStatusBadge(result.protectionScore)}`}>
                  {scoreStatus(result.protectionScore)}
                </span>
              </div>
              <p className={`mt-1 text-[1.5rem] font-extrabold tabular-nums leading-none ${riskScoreColor(result.protectionScore)}`}>{result.protectionScore}</p>
              <p className="mt-1 text-[10px] text-slate-400">Quanto da necessidade está coberta</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-[4px] rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${result.protectionScore < 30 ? 'bg-red-300' : result.protectionScore < 70 ? 'bg-amber-300' : 'bg-emerald-300'}`} style={{ width: `${result.protectionScore}%` }} />
                </div>
                <span className="text-[11px] font-medium text-slate-400 tabular-nums">{result.protectionScore}%</span>
              </div>
            </div>
          </div>
          {/* Efficiency Score */}
          <div className="box animate-fadeIn">
            <div className="px-4 py-3">
              <div className="flex items-start justify-between gap-1">
                <p className="text-[12px] font-medium text-slate-500">Eficiência</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreStatusBadge(result.coverageEfficiencyScore)}`}>
                  {scoreStatus(result.coverageEfficiencyScore)}
                </span>
              </div>
              <p className={`mt-1 text-[1.5rem] font-extrabold tabular-nums leading-none ${riskScoreColor(result.coverageEfficiencyScore)}`}>{result.coverageEfficiencyScore}</p>
              <p className="mt-1 text-[10px] text-slate-400">Calibragem da apólice atual</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-[4px] rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${result.coverageEfficiencyScore < 30 ? 'bg-red-300' : result.coverageEfficiencyScore < 70 ? 'bg-amber-300' : 'bg-emerald-300'}`} style={{ width: `${result.coverageEfficiencyScore}%` }} />
                </div>
                <span className="text-[11px] font-medium text-slate-400 tabular-nums">{result.coverageEfficiencyScore}%</span>
              </div>
            </div>
          </div>
          {/* Gap */}
          <div className="box animate-fadeIn">
            <div className="px-4 py-3">
              <div className="flex items-start justify-between gap-1">
                <p className="text-[12px] font-medium text-slate-500">Gap de Cobertura</p>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${result.protectionGapPercentage > 0 ? 'bg-red-100/80' : 'bg-emerald-100/80'}`}>
                  {result.protectionGapPercentage > 0 ? <TrendingDown className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-emerald-500" />}
                </div>
              </div>
              <p className={`mt-1 text-[1.5rem] font-extrabold tabular-nums leading-none ${result.protectionGapPercentage > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {Math.abs(result.protectionGapPercentage).toFixed(0)}%
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                {result.protectionGapPercentage > 0 ? 'Déficit' : result.protectionGapPercentage < 0 ? 'Excedente' : 'Alinhado'} — {formatCurrency(Math.abs(result.protectionGapAmount))}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-[4px] rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${result.protectionGapPercentage > 0 ? 'bg-red-300' : 'bg-emerald-300'}`} style={{ width: `${Math.min(Math.abs(result.protectionGapPercentage), 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
          {/* Coverage Ratio */}
          <div className="box animate-fadeIn">
            <div className="px-4 py-3">
              <div className="flex items-start justify-between gap-1">
                <p className="text-[12px] font-medium text-slate-500">Cobertura Contratada</p>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100/80">
                  <Shield className="h-4 w-4 text-brand-500" />
                </div>
              </div>
              <p className="mt-1 text-[1.5rem] font-extrabold tabular-nums leading-none text-slate-900">
                {result.recommendedCoverageAmount > 0
                  ? `${((result.currentCoverageAmount / result.recommendedCoverageAmount) * 100).toFixed(0)}%`
                  : '—'}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                {formatCurrency(result.currentCoverageAmount)} de {formatCurrency(result.recommendedCoverageAmount)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-[4px] rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-brand-300 transition-all duration-700" style={{ width: `${result.recommendedCoverageAmount > 0 ? Math.min((result.currentCoverageAmount / result.recommendedCoverageAmount) * 100, 100) : 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ TAB BAR ═══ */}
        <div className="box overflow-hidden">
          <div className="flex border-b border-slate-100">
            <TabButton id="resultado" active={activeTab} label="Resultado" icon={BarChart3} onClick={setActiveTab} />
            <TabButton id="insights" active={activeTab} label="Insights" icon={Lightbulb} badge={insightCount > 0 ? insightCount : undefined} onClick={setActiveTab} />
            <TabButton id="auditoria" active={activeTab} label="Auditoria" icon={ShieldCheck} onClick={setActiveTab} />
          </div>
        </div>

        {/* ═══ TAB CONTENT: Resultado ═══ */}
        {activeTab === 'resultado' && (
          <div className="space-y-4">

            {/* Trigger comparison — before vs after */}
            {record?.request.operationalData.recentLifeTrigger && previousResult && (
              <div className="box border-l-4 border-l-amber-300">
                <div className="box-header">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="box-header-title">Impacto do Gatilho de Vida</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Antes vs Depois</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[12px] text-slate-500 mb-3">Comparação entre a avaliação anterior e o resultado após o evento de vida.</p>
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
                        <div key={item.label} className="rounded-sm border border-slate-100 bg-slate-50/50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{item.label}</p>
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
                            <p className={`mt-1 text-[10px] font-semibold tabular-nums ${improved ? 'text-emerald-600' : 'text-red-500'}`}>
                              {diff > 0 ? '+' : ''}{item.fmt === 'currency' ? formatCurrency(diff) : `${diff.toFixed(0)}%`}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Row: Coverage vs Necessity + Score Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Coverage gap */}
              <div className="box">
                <div className="box-header">
                  <span className="box-header-title">Cobertura vs. Necessidade</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[12px] text-slate-500 mb-3">
                    Comparação entre o capital contratado e o necessário para proteger a família, calculado com base em renda, dependentes, dívidas e patrimônio.
                  </p>
                  <GapBar
                    current={result.currentCoverageAmount}
                    recommended={result.recommendedCoverageAmount}
                  />
                  <div className="mt-3 flex items-center justify-between rounded-sm border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="text-[11px] font-medium text-slate-500">Cobertura contratada</span>
                    <span className={`text-[13px] font-bold tabular-nums ${riskScoreColor(result.protectionScore)}`}>
                      {result.recommendedCoverageAmount > 0
                        ? `${((result.currentCoverageAmount / result.recommendedCoverageAmount) * 100).toFixed(0)}%`
                        : '—'
                      } da necessidade
                    </span>
                  </div>
                </div>
              </div>

              {/* Scores detailed */}
              <div className="box">
                <div className="box-header">
                  <span className="box-header-title">Análise dos Scores</span>
                  <div className="flex items-center gap-3">
                    <ScalePill range="0-29" hint="Crítico" colorClass="bg-red-400" />
                    <ScalePill range="30-69" hint="Moderado" colorClass="bg-amber-400" />
                    <ScalePill range="70-100" hint="Adequado" colorClass="bg-emerald-400" />
                  </div>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <ScoreRow score={result.protectionScore} meta={SCORE_DESCRIPTIONS.protection} />
                  <ScoreRow score={result.coverageEfficiencyScore} meta={SCORE_DESCRIPTIONS.efficiency} />
                </div>
              </div>
            </div>

            {/* Coverage breakdown */}
            {result.recommendedCoverageAmount > 0 && (
              <div className="box">
                <div className="box-header">
                  <span className="box-header-title">Composição da Cobertura Recomendada</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{formatCurrency(result.recommendedCoverageAmount)}</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[12px] text-slate-500 mb-3">
                    Cada componente representa uma necessidade específica identificada pelo motor. O valor total é a soma de todas as proteções necessárias.
                  </p>

                  <StackedCoverageBar result={result} />

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full table-synto">
                      <thead>
                        <tr>
                          <th className="text-left">Componente</th>
                          <th className="text-right">Valor</th>
                          <th className="text-center">%</th>
                          <th className="text-left">Proporção</th>
                        </tr>
                      </thead>
                      <tbody>
                        {COVERAGE_ITEMS
                          .map((item) => ({ ...item, value: item.getValue(result) }))
                          .filter((item) => item.value > 0)
                          .map((item) => {
                            const pctVal = (item.value / result.recommendedCoverageAmount) * 100
                            return (
                              <tr key={item.label}>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${item.color}`} />
                                    <span className="font-medium">{item.label}</span>
                                  </div>
                                </td>
                                <td className="text-right font-semibold tabular-nums">{formatCurrency(item.value)}</td>
                                <td className="text-center tabular-nums">{pctVal.toFixed(1)}%</td>
                                <td>
                                  <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                    <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${pctVal}%` }} />
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-sm border border-brand-100 bg-brand-50 px-3 py-2.5">
                    <span className="text-[13px] font-bold text-brand-800">Capital Segurado Recomendado</span>
                    <span className="text-base font-extrabold tabular-nums text-brand-700">
                      {formatCurrency(result.recommendedCoverageAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Row: Justifications + Client Context */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Justifications */}
              {result.justificationsRendered?.length > 0 && (
                <div className="box">
                  <div className="box-header">
                    <span className="box-header-title">Justificativas do Cálculo</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{result.justificationsRendered.length} {result.justificationsRendered.length === 1 ? 'regra' : 'regras'}</span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[12px] text-slate-500 mb-3">
                      Regras e critérios aplicados pelo motor que influenciaram diretamente o resultado desta avaliação.
                    </p>
                    <ul className="space-y-1.5">
                      {result.justificationsRendered.map((text, i) => (
                        <li key={i} className="flex items-start gap-2 rounded-sm border border-slate-100 bg-slate-50/50 px-3 py-2">
                          <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
                          <span className="text-[13px] leading-relaxed text-slate-700">{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Client context */}
              {req && (
                <div className="box">
                  <div className="box-header">
                    <span className="box-header-title">Dados do Cliente</span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[12px] text-slate-500 mb-3">
                      Perfil utilizado pelo motor para calcular a necessidade de proteção.
                    </p>

                    <SectionLabel icon={User} label="Perfil Pessoal" />
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <ContextCard icon={User} label="Idade" value={`${req.personalContext.age} anos`} />
                      <ContextCard icon={Baby} label="Dependentes" value={`${req.familyContext.dependentsCount}`} />
                      <ContextCard icon={Briefcase} label="Risco profissional" value={req.personalContext.professionRiskLevel} />
                      <ContextCard icon={Cigarette} label="Fumante" value={req.personalContext.isSmoker ? 'Sim' : 'Não'} />
                    </div>

                    <SectionLabel icon={DollarSign} label="Financeiro" />
                    <div className="grid grid-cols-2 gap-2 mb-4">
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
                            return total > 0 ? formatCurrency(total) : 'Sem apólice'
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
                        label="Reserva"
                        value={req.financialContext.emergencyFundMonths != null
                          ? `${req.financialContext.emergencyFundMonths} meses`
                          : 'Não informado'}
                      />
                      {req.financialContext.educationCosts?.totalEstimatedCost != null &&
                        req.financialContext.educationCosts.totalEstimatedCost > 0 && (
                        <ContextCard icon={GraduationCap} label="Educação" value={formatCurrency(req.financialContext.educationCosts.totalEstimatedCost)} />
                      )}
                      {req.financialContext.estate?.totalEstateValue != null &&
                        req.financialContext.estate.totalEstateValue > 0 && (
                        <ContextCard icon={Landmark} label="Patrimônio" value={formatCurrency(req.financialContext.estate.totalEstateValue)} />
                      )}
                    </div>

                    <SectionLabel icon={BarChart3} label="Operacional" />
                    <div className="grid grid-cols-2 gap-2">
                      <ContextCard icon={BarChart3} label="Canal" value={req.operationalData.originChannel} />
                      <ContextCard icon={Shield} label="Consentimento" value={req.operationalData.hasExplicitActiveConsent ? 'Ativo' : 'Pendente'} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CTA — Trigger */}
            {record && (
              <div className="box border-l-4 border-l-amber-300">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                  <div className="flex items-start gap-2.5 flex-1">
                    <Zap className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-[13px] font-semibold text-amber-900">Houve mudança na vida do cliente?</p>
                      <p className="text-xs text-amber-700/80">
                        Casamento, nascimento, compra de imóvel — registre um gatilho para recalcular.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/triggers/new', { state: { prefill: record.request } })}
                    className="shrink-0 flex items-center gap-1.5 rounded-sm bg-amber-400 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 transition-colors"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Registrar Gatilho
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB CONTENT: Insights ═══ */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {insightCount > 0 ? (
              <>
                {/* Header card */}
                <div className="box border-l-4 border-l-brand-300">
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Lightbulb className="h-4 w-4 text-brand-500" />
                      <h2 className="text-sm font-bold text-slate-900">Insights para o Corretor</h2>
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                        {insightCount} {insightCount === 1 ? 'insight' : 'insights'}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500">
                      Sugestões de abordagem personalizadas geradas pelo motor com base no gap, risco e contexto do cliente.
                    </p>
                  </div>
                </div>

                {/* Insight cards */}
                {result.brokerInsights.map((insight, i) => (
                  <div key={i} className="reveal-up" style={{ animationDelay: `${0.05 + i * 0.05}s` }}>
                    <InsightCard insight={insight} />
                  </div>
                ))}
              </>
            ) : (
              <div className="box">
                <div className="flex flex-col items-center justify-center gap-2 px-4 py-12">
                  <Lightbulb className="h-6 w-6 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-500">Nenhum insight disponível</p>
                  <p className="text-xs text-slate-400">Esta avaliação não gerou insights de abordagem.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB CONTENT: Auditoria ═══ */}
        {activeTab === 'auditoria' && (
          <div className="space-y-4">
            {result.audit && (
              <>
                {/* Metadata */}
                <div className="box">
                  <div className="box-header">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="box-header-title">Metadados de Auditoria</span>
                    </div>
                    {id && (
                      <button
                        onClick={() => navigate('/audit')}
                        className="flex items-center gap-1.5 rounded-sm border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                      >
                        <ShieldCheck className="h-3 w-3 text-brand-500" />
                        Verificar Integridade
                      </button>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[12px] text-slate-500 mb-3">
                      Rastreabilidade técnica — versão do motor e regras utilizadas nesta avaliação.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="table-synto w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left">Campo</th>
                            <th className="text-left">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <div className="flex items-center gap-2">
                                <Activity className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-medium">Versão do Motor</span>
                              </div>
                            </td>
                            <td><span className="font-mono text-xs tabular-nums">{result.audit.engineVersion}</span></td>
                          </tr>
                          <tr>
                            <td>
                              <div className="flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-medium">Versão do Ruleset</span>
                              </div>
                            </td>
                            <td><span className="font-mono text-xs tabular-nums">{result.audit.ruleSetVersion}</span></td>
                          </tr>
                          <tr>
                            <td>
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-medium">Consent ID</span>
                              </div>
                            </td>
                            <td><span className="font-mono text-xs tabular-nums">{result.audit.consentId}</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Hash */}
                {record?.auditHash && (
                  <div className="box border-l-4 border-l-slate-300">
                    <div className="box-header">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-slate-400" />
                        <span className="box-header-title">Audit Hash SHA-256</span>
                      </div>
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
                    <div className="px-4 py-3">
                      <p className="text-[12px] text-slate-500 mb-2">
                        Hash criptográfico que garante a integridade dos dados desta avaliação.
                      </p>
                      <div className="rounded-sm border border-slate-100 bg-slate-50 px-3 py-2.5">
                        <p className="break-all font-mono text-[11px] text-slate-600 leading-relaxed">{record.auditHash}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Applied Rules */}
                {result.audit.appliedRules?.length > 0 && (
                  <div className="box">
                    <div className="box-header">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-brand-500" />
                        <span className="box-header-title">Regras Aplicadas</span>
                      </div>
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                        {result.audit.appliedRules.length} regra{result.audit.appliedRules.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[12px] text-slate-500 mb-3">
                        Regras do motor utilizadas para calcular esta avaliação.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.audit.appliedRules.map((r) => (
                          <span
                            key={r}
                            className="rounded-sm bg-brand-50 border border-brand-100 px-2.5 py-1 font-mono text-[11px] font-medium text-brand-700"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>

      {/* ── Status confirmation modal ── */}
      {confirmAction && id && (
        <StatusChangeModal
          evaluationId={id}
          initialStatus={confirmAction.status}
          onConfirmed={handleStatusConfirmed}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}

// ── TabButton ─────────────────────────────────────────────────────
function TabButton({
  id, active, label, icon: Icon, badge, onClick,
}: {
  id: TabId
  active: TabId
  label: string
  icon: React.ElementType
  badge?: number
  onClick: (id: TabId) => void
}) {
  const isActive = id === active
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`relative flex items-center gap-2 px-4 py-3 transition-all cursor-pointer ${
        isActive ? 'bg-brand-50/60' : 'hover:bg-slate-50'
      }`}
    >
      {isActive && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-brand-600" />
      )}
      <Icon className={`h-4 w-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
      <span className={`text-[13px] font-semibold ${isActive ? 'text-brand-700' : 'text-slate-500'}`}>{label}</span>
      {badge !== undefined && (
        <span className={`flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
          isActive ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'
        }`}>{badge}</span>
      )}
    </button>
  )
}

// ── Coverage items config ─────────────────────────────────────────
const COVERAGE_ITEMS = [
  {
    label: 'Substituição de Renda',
    color: 'bg-brand-300',
    explanation: 'Capital necessário para manter a renda familiar durante o período de transição.',
    getValue: (r: LifeInsuranceAssessmentResult) => r.incomeReplacementAmount,
  },
  {
    label: 'Quitação de Dívidas',
    color: 'bg-amber-300',
    explanation: 'Valor para liquidar todas as dívidas pendentes em caso de sinistro.',
    getValue: (r: LifeInsuranceAssessmentResult) => r.debtClearanceAmount,
  },
  {
    label: 'Reserva de Transição',
    color: 'bg-sky-300',
    explanation: 'Colchão financeiro para despesas imediatas e reorganização familiar.',
    getValue: (r: LifeInsuranceAssessmentResult) => r.transitionReserveAmount,
  },
  {
    label: 'Custos de Educação',
    color: 'bg-violet-300',
    explanation: 'Proteção para garantir a educação dos dependentes até a fase adulta.',
    getValue: (r: LifeInsuranceAssessmentResult) => r.educationCostsAmount,
  },
  {
    label: 'ITCMD (Imposto Herança)',
    color: 'bg-orange-300',
    explanation: 'Imposto estadual sobre transmissão de bens que incide sobre o patrimônio.',
    getValue: (r: LifeInsuranceAssessmentResult) => r.itcmdCostAmount,
  },
  {
    label: 'Custos de Inventário',
    color: 'bg-rose-300',
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
  const barColor = score < 30 ? 'from-red-200 to-red-300' : score < 70 ? 'from-amber-200 to-amber-300' : 'from-emerald-200 to-emerald-300'
  const scoreLabel = score < 30 ? 'Crítico' : score < 70 ? 'Moderado' : 'Adequado'
  const scoreBadge = score < 30 ? 'bg-red-100 text-red-700' : score < 70 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'

  return (
    <div className="rounded-sm border border-slate-100 bg-slate-50 p-4 sm:p-5">
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
          <p className={`text-2xl font-extrabold tabular-nums leading-none tracking-tight ${scoreColor}`}>
            {score}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">de 100</p>
        </div>
      </div>

      <div className="relative">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
            style={{ width: `${score}%` }}
          />
        </div>
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

      <div className="mt-3 flex items-start gap-2 rounded-sm bg-white border border-slate-100 px-3 py-2">
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
    <div className="box">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/50 transition-colors"
      >
        <Icon className={`h-4 w-4 shrink-0 ${meta.iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badgeBg} ${meta.badgeText}`}>
              {meta.label}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priority.className}`}>
              {priority.label}
            </span>
          </div>
          <p className="text-[13px] font-semibold text-slate-800">{insight.headline}</p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-[#f3f3f3] px-4 pb-3 pt-2.5">
          <p className="text-[12px] leading-relaxed text-slate-600 whitespace-pre-line">{insight.body}</p>
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

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  )
}

function ContextCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-sm border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-3">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      </div>
      <p className="truncate text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}

function AuditRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-sm border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="mb-1.5 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
    </div>
  )
}
