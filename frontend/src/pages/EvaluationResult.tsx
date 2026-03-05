import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Zap, ArrowLeft, CheckCircle, Clock, Loader2, AlertCircle,
  TrendingUp, TrendingDown, Minus, RotateCcw, Copy, Check,
  ShieldCheck, Shield, BarChart3, User, DollarSign, Baby,
  Lightbulb, MessageSquare, Target, HelpCircle, Package, ArrowRight,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { ScoreRing } from '../components/ui/ScoreRing'
import { GapBar } from '../components/ui/GapBar'
import { Badge } from '../components/ui/Badge'
import { getEvaluation } from '../lib/api'
import {
  actionColors, actionLabel, riskColors, riskLabel, coverageStatusLabel,
  formatCurrency, formatDate, riskScoreColor,
} from '../lib/utils'
import type {
  EvaluationRecord, LifeInsuranceAssessmentResult, RecommendedAction,
  BrokerInsight, InsightCategory,
} from '../types/api'

// ── Explanatory copy ──────────────────────────────────────────────
const ACTION_EXPLANATION: Record<RecommendedAction, string> = {
  AUMENTAR: 'A cobertura atual está aquém da proteção necessária. O motor identificou um déficit em relação à renda e dependentes — recomende ao cliente o aumento da apólice.',
  MANTER:   'A cobertura está bem calibrada para o perfil atual. Nenhuma ação imediata é necessária — programe uma revisão periódica.',
  REDUZIR:  'A cobertura excede a necessidade calculada. É possível otimizar o prêmio sem comprometer a proteção real da família.',
  REVISAR:  'Dados incompletos ou situação atípica impedem uma recomendação automática. Uma revisão manual com o cliente é recomendada.',
}

const ACTION_THEME: Record<RecommendedAction, { border: string; bg: string; text: string; iconColor: string }> = {
  AUMENTAR: { border: 'border-red-200',    bg: 'bg-red-50',    text: 'text-red-800',    iconColor: 'text-red-600' },
  MANTER:   { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-800', iconColor: 'text-emerald-600' },
  REDUZIR:  { border: 'border-sky-200',    bg: 'bg-sky-50',    text: 'text-sky-800',    iconColor: 'text-sky-600' },
  REVISAR:  { border: 'border-amber-200',  bg: 'bg-amber-50',  text: 'text-amber-800',  iconColor: 'text-amber-600' },
}

const ACTION_ICONS: Record<RecommendedAction, React.ElementType> = {
  AUMENTAR: TrendingUp,
  MANTER:   Minus,
  REDUZIR:  TrendingDown,
  REVISAR:  RotateCcw,
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
  const [activeTab, setActiveTab] = useState<TabId>('resultado')

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

  function copyHash(hash: string) {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedHash(true)
      setTimeout(() => setCopiedHash(false), 1500)
    })
  }

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        <span className="text-sm">Carregando resultado…</span>
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
        subtitle={id ? `ID: ${id.slice(0, 18)}…` : 'Avaliação recém-gerada'}
      />

      <div className="animate-fadeIn p-6 space-y-5">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        {/* ── Diagnosis / recommendation card — always visible ── */}
        <div className={`rounded-2xl border p-5 shadow-card ${actionTheme.border} ${actionTheme.bg}`}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/60">
              <ActionIcon className={`h-5 w-5 ${actionTheme.iconColor}`} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
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
              <p className={`mt-2 text-sm leading-relaxed ${actionTheme.text}`}>
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

            {/* Coverage gap */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-sm font-semibold text-slate-900">Cobertura vs. Necessidade</h2>
              <p className="mt-0.5 mb-5 text-xs text-slate-500">
                Comparativo entre a cobertura atual do cliente e o valor recomendado pelo motor.
              </p>
              <GapBar
                current={result.currentCoverageAmount}
                recommended={result.recommendedCoverageAmount}
              />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Gap (R$)</p>
                  <p className={`mt-1 text-xl font-bold tabular-nums ${result.protectionGapAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(Math.abs(result.protectionGapAmount))}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {result.protectionGapAmount > 0 ? '↑ déficit de cobertura' : '↓ excedente de cobertura'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Gap (%)</p>
                  <p className={`mt-1 text-xl font-bold tabular-nums ${result.protectionGapPercentage > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {Math.abs(result.protectionGapPercentage).toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Status: {coverageStatusLabel(result.coverageStatus)}
                  </p>
                </div>
              </div>
            </div>

            {/* Scores */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-sm font-semibold text-slate-900">Scores da Avaliação</h2>
              <p className="mt-0.5 mb-4 text-xs text-slate-500">
                Dois indicadores calculados pelo motor a partir do perfil financeiro e familiar do cliente.
              </p>
              <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
                <p className="text-[11px] font-semibold text-slate-500 shrink-0">Escala de referência:</p>
                <div className="flex flex-wrap items-center gap-3">
                  <ScalePill range="0 – 29"   hint="Crítico"  colorClass="bg-red-100 text-red-700" />
                  <ScalePill range="30 – 69"  hint="Moderado" colorClass="bg-amber-100 text-amber-700" />
                  <ScalePill range="70 – 100" hint="Adequado" colorClass="bg-emerald-100 text-emerald-700" />
                </div>
              </div>
              <div className="space-y-3">
                <ScoreRow
                  score={result.protectionScore}
                  nameLocal="Score de Proteção"
                  nameTech="Protection Score"
                  description="Mede quantos % da cobertura necessária (calculada pelo motor) a apólice atual já cobre. 100 = cobertura completa para o perfil. 0 = sem nenhuma cobertura. Quanto maior, melhor."
                />
                <ScoreRow
                  score={result.coverageEfficiencyScore}
                  nameLocal="Score de Eficiência"
                  nameTech="Efficiency Score"
                  description="Avalia se a apólice está bem dimensionada. Penaliza tanto a subcobertura quanto a sobrecobertura excessiva. 100 = cobertura perfeitamente calibrada para renda + dependentes + dívidas."
                />
              </div>
            </div>

            {/* Client context */}
            {req && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <h2 className="mb-1 text-sm font-semibold text-slate-900">Dados do Cliente Avaliado</h2>
                <p className="mb-4 text-xs text-slate-500">
                  Perfil utilizado pelo motor para calcular a necessidade de cobertura.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <ContextCard icon={User} label="Idade" value={`${req.personalContext.age} anos`} />
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
                    value={req.financialContext.currentLifeInsurance?.coverageAmount != null
                      ? formatCurrency(req.financialContext.currentLifeInsurance.coverageAmount)
                      : 'Sem apólice'
                    }
                  />
                  <ContextCard icon={Baby}     label="Dependentes"       value={`${req.familyContext.dependentsCount}`} />
                  <ContextCard icon={Shield}   label="Risco profissional" value={req.personalContext.professionRiskLevel} />
                  <ContextCard icon={BarChart3} label="Canal de origem"   value={req.operationalData.originChannel} />
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/triggers/new')}
                className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 transition-colors"
              >
                <Zap className="h-4 w-4" />
                Registrar Gatilho de Vida
              </button>
              <button
                onClick={() => navigate('/evaluations/new')}
                className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 transition-colors"
              >
                Nova Avaliação
              </button>
            </div>
          </div>
        )}

        {/* ── Tab: Insights ── */}
        {activeTab === 'insights' && (
          <div className="space-y-5">
            {insightCount > 0 ? (
              <div className="rounded-2xl border border-brand-200 bg-gradient-to-b from-brand-50 to-white p-5 shadow-card">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100">
                    <Lightbulb className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-brand-900">Insights para o Corretor</h2>
                    <p className="mt-0.5 text-xs text-brand-600">
                      Sugestões de abordagem geradas pelo motor com base neste resultado específico.
                      Personalizadas para o perfil, gap e contexto do cliente.
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

            {/* Justifications */}
            {result.justificationsRendered?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <h2 className="mb-1 text-sm font-semibold text-slate-900">Justificativas do Cálculo</h2>
                <p className="mb-4 text-xs text-slate-500">
                  Regras aplicadas pelo motor que influenciaram este resultado.
                </p>
                <ul className="space-y-2">
                  {result.justificationsRendered.map((text, i) => (
                    <li key={i} className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      <span className="text-sm text-slate-700">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Audit metadata */}
            {result.audit && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Metadados de Auditoria</h2>
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

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-4">
                  <AuditRow label="Versão do Motor"   value={result.audit.engineVersion} />
                  <AuditRow label="Versão do Ruleset" value={result.audit.ruleSetVersion} />
                  <AuditRow label="Consent ID"        value={result.audit.consentId} />
                </div>

                {record?.auditHash && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 mb-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Regras Aplicadas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.audit.appliedRules.map((r) => (
                        <span
                          key={r}
                          className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600"
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
        flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all
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
  const [open, setOpen] = React.useState(false)
  const meta     = INSIGHT_META[insight.category]
  const priority = PRIORITY_BADGE[insight.priority]
  const Icon = meta.icon

  return (
    <div className={`rounded-lg border bg-white ${meta.borderColor}`}>
      {/* Header — always visible, clickable to expand */}
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

      {/* Body — expands on click */}
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
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${colorClass}`}>{range}</span>
      <span className="text-[11px] text-slate-500">{hint}</span>
    </div>
  )
}

function ScoreRow({
  score, nameLocal, nameTech, description,
}: {
  score: number
  nameLocal: string
  nameTech: string
  description: string
}) {
  const barColor = score < 30 ? 'bg-red-500' : score < 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
      {/* Ring */}
      <ScoreRing score={score} size={88} strokeWidth={7} />
      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-bold text-slate-900">{nameLocal}</p>
          <p className="font-mono text-[11px] text-slate-400">{nameTech}</p>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{description}</p>
        {/* Progress bar */}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className={`shrink-0 text-xs font-bold tabular-nums ${riskScoreColor(score)}`}>
            {score}<span className="font-normal text-slate-400">/100</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function ContextCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
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
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}
