import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, ChevronLeft, Send, AlertCircle,
  User, Banknote, Users, ClipboardCheck,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { postEvaluation, getActiveTenantId } from '../lib/api'
import { generateIdempotencyKey } from '../lib/utils'
import type { LifeInsuranceAssessmentRequest } from '../types/api'

// ── Currency helpers ─────────────────────────────────────────────
function parseCurrency(raw: string): number {
  return Number(raw.replace(/\D/g, '')) || 0
}

function formatBRL(raw: string): string {
  const n = parseCurrency(raw)
  if (!n) return ''
  return new Intl.NumberFormat('pt-BR').format(n)
}

// ── Step metadata ────────────────────────────────────────────────
const STEPS = [
  {
    label: 'Pessoal',
    icon: User,
    description: 'Perfil demográfico e de risco individual do segurado',
  },
  {
    label: 'Financeiro',
    icon: Banknote,
    description: 'Renda, cobertura atual e passivos para cálculo do gap de proteção',
  },
  {
    label: 'Família',
    icon: Users,
    description: 'Dependentes e estrutura familiar para dimensionar a proteção necessária',
  },
  {
    label: 'Operacional',
    icon: ClipboardCheck,
    description: 'Canal, consentimento LGPD e rastreabilidade do diagnóstico',
  },
]

// ── Component ────────────────────────────────────────────────────
export default function NewEvaluation() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Personal
  const [age, setAge] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [professionRisk, setProfessionRisk] = useState('BAIXO')
  const [isSmoker, setIsSmoker] = useState(false)

  // Financial (raw digit strings — formatted for display via CurrencyInput)
  const [income, setIncome] = useState('')
  const [currentCoverage, setCurrentCoverage] = useState('')
  const [policyType, setPolicyType] = useState('')
  const [debtTotal, setDebtTotal] = useState('')
  const [debtMonths, setDebtMonths] = useState('')
  const [emergencyFund, setEmergencyFund] = useState('')

  // Family
  const [dependentsCount, setDependentsCount] = useState('0')
  const [dependentsAges, setDependentsAges] = useState('')

  // Operational
  const [channel, setChannel] = useState('Web')
  const [consent, setConsent] = useState(false)
  const [consentId, setConsentId] = useState(`consent-${Date.now()}`)
  const [hasUnconfirmed, setHasUnconfirmed] = useState(false)
  const [lastReviewMonthsAgo, setLastReviewMonthsAgo] = useState('')

  function clearError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  // ── Validation ───────────────────────────────────────────────
  function validateStep(s: number): Record<string, string> {
    const errors: Record<string, string> = {}
    if (s === 0) {
      const ageNum = Number(age)
      if (!age.trim()) errors.age = 'Idade é obrigatória.'
      else if (ageNum < 18 || ageNum > 99) errors.age = 'Deve estar entre 18 e 99 anos.'
    }
    if (s === 1) {
      if (parseCurrency(income) === 0) errors.income = 'Renda mensal é obrigatória e deve ser maior que zero.'
    }
    if (s === 3) {
      if (!consentId.trim()) errors.consentId = 'ID de consentimento é obrigatório (LGPD).'
      if (!consent) errors.consent = 'Consentimento ativo do cliente é obrigatório para gerar o diagnóstico (LGPD).'
    }
    return errors
  }

  function handleNext() {
    const errors = validateStep(step)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    setStep((s) => s + 1)
    setFieldErrors({})
  }

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit() {
    const errors = validateStep(3)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    setSubmitError(null)
    try {
      const lastReviewDate = lastReviewMonthsAgo
        ? new Date(Date.now() - Number(lastReviewMonthsAgo) * 30 * 24 * 3600 * 1000).toISOString()
        : undefined

      const req: LifeInsuranceAssessmentRequest = {
        personalContext: {
          age: Number(age),
          maritalStatus: maritalStatus as never || undefined,
          professionRiskLevel: professionRisk as never,
          isSmoker,
        },
        financialContext: {
          monthlyIncome: { exactValue: parseCurrency(income) },
          currentLifeInsurance: currentCoverage ? {
            coverageAmount: parseCurrency(currentCoverage),
            policyType: policyType as never || undefined,
          } : undefined,
          debts: debtTotal ? {
            totalAmount: parseCurrency(debtTotal),
            remainingTermMonths: debtMonths ? Number(debtMonths) : undefined,
          } : undefined,
          emergencyFundMonths: emergencyFund ? Number(emergencyFund) : undefined,
        },
        familyContext: {
          dependentsCount: Number(dependentsCount),
          dependentsAges: dependentsAges
            ? dependentsAges.split(',').map((a) => parseInt(a.trim(), 10)).filter((n) => !isNaN(n))
            : [],
        },
        operationalData: {
          originChannel: channel,
          hasExplicitActiveConsent: consent,
          consentId,
          hasUnconfirmedData: hasUnconfirmed,
          lastReviewDate,
          tenantId: getActiveTenantId() ?? undefined,
        },
      }

      const result = await postEvaluation(req, generateIdempotencyKey())
      sessionStorage.setItem('lt_last_result', JSON.stringify(result))
      navigate('/evaluations/result')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erro ao processar avaliação.')
    } finally {
      setLoading(false)
    }
  }

  const StepIcon = STEPS[step].icon
  const progress = (step / (STEPS.length - 1)) * 100

  return (
    <div>
      <TopBar title="Nova Avaliação" subtitle="Diagnóstico de necessidade de proteção de vida" />

      <div className="p-6">
        <div className="mx-auto max-w-2xl space-y-5">

          {/* ── Stepper ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Progresso</span>
              <span>Passo {step + 1} de {STEPS.length}</span>
            </div>
            <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full bg-indigo-600 transition-all duration-500"
                style={{ width: step === 0 ? '8%' : `${progress}%` }}
              />
            </div>
            <div className="flex items-start justify-between">
              {STEPS.map((s, i) => {
                const Icon = s.icon
                const done = i < step
                const active = i === step
                return (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                      done   ? 'border-indigo-600 bg-indigo-600 text-white' :
                      active ? 'border-indigo-600 bg-white text-indigo-600 shadow-sm' :
                               'border-slate-200 bg-slate-50 text-slate-400'
                    }`}>
                      {done ? '✓' : <Icon className="h-4 w-4" />}
                    </div>
                    <span className={`text-center text-[11px] font-medium leading-tight ${
                      active ? 'text-indigo-700' : done ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Step header ── */}
          <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
              <StepIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-900">{STEPS[step].label}</p>
              <p className="text-xs text-indigo-600">{STEPS[step].description}</p>
            </div>
          </div>

          {/* ── Form card ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">

            {/* ── Step 0: Personal ── */}
            {step === 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Idade *"
                    hint="Entre 18 e 99 anos. Afeta o multiplicador de risco etário do motor."
                    error={fieldErrors.age}
                  >
                    <input
                      type="number" min="18" max="99"
                      value={age}
                      onChange={(e) => { setAge(e.target.value); clearError('age') }}
                      placeholder="Ex: 35"
                      className={cls(!!fieldErrors.age)}
                    />
                  </Field>
                  <Field
                    label="Estado Civil"
                    hint="Impacta a análise de dependência financeira do cônjuge."
                  >
                    <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className={cls()}>
                      <option value="">Não informado</option>
                      <option value="SOLTEIRO">Solteiro(a)</option>
                      <option value="CASADO">Casado(a) / União Estável</option>
                      <option value="DIVORCIADO">Divorciado(a) / Separado(a)</option>
                      <option value="VIUVO">Viúvo(a)</option>
                    </select>
                  </Field>
                </div>

                <Field
                  label="Risco da Profissão *"
                  hint="Profissões de maior risco elevam o capital segurado recomendado pelo motor."
                >
                  <div className="grid grid-cols-2 gap-2">
                    {PROFESSION_RISKS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setProfessionRisk(opt.value)}
                        className={`rounded-xl border p-3.5 text-left transition-all ${
                          professionRisk === opt.value
                            ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`h-2 w-2 rounded-full ${opt.dot}`} />
                          <p className={`text-xs font-semibold ${professionRisk === opt.value ? 'text-indigo-700' : 'text-slate-700'}`}>
                            {opt.label}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </Field>

                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  isSmoker ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}>
                  <input
                    type="checkbox"
                    checked={isSmoker}
                    onChange={(e) => setIsSmoker(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <div>
                    <p className={`text-sm font-semibold ${isSmoker ? 'text-amber-800' : 'text-slate-700'}`}>
                      Cliente é fumante
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Tabagismo é um fator de risco reconhecido. O motor acrescenta um percentual adicional
                      ao capital segurado recomendado para compensar o risco elevado.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* ── Step 1: Financial ── */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Renda Mensal Bruta *"
                    hint="Principal parâmetro do cálculo. O motor multiplica a renda anual por um fator de anos de reposição."
                    error={fieldErrors.income}
                  >
                    <CurrencyInput
                      value={income}
                      onChange={(v) => { setIncome(v); clearError('income') }}
                      placeholder="10.000"
                      hasError={!!fieldErrors.income}
                    />
                  </Field>
                  <Field
                    label="Reserva de Emergência"
                    hint="Meses de gastos cobertos pela reserva líquida. Meta-padrão do motor: 6 meses."
                  >
                    <div className="relative">
                      <input
                        type="number" min="0" max="24"
                        value={emergencyFund}
                        onChange={(e) => setEmergencyFund(e.target.value)}
                        placeholder="Ex: 6"
                        className={`${cls()} pr-16`}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">meses</span>
                    </div>
                  </Field>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Seguro de Vida Atual</p>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">opcional</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Preencha se o cliente já possui apólice vigente. O motor calcula o gap entre a cobertura atual e a ideal.
                      Deixe em branco se não tiver seguro — o motor assumirá cobertura zero.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Capital Segurado Atual" hint="Valor total da cobertura da apólice vigente.">
                      <CurrencyInput value={currentCoverage} onChange={setCurrentCoverage} placeholder="200.000" />
                    </Field>
                    <Field label="Tipo de Apólice" hint="Modalidade contratual do seguro vigente.">
                      <select value={policyType} onChange={(e) => setPolicyType(e.target.value)} className={cls()}>
                        <option value="">Não informado</option>
                        <option value="TEMPORARIO">Temporário</option>
                        <option value="VIDA_INTEIRA">Vida Inteira</option>
                        <option value="ACIDENTES_PESSOAIS">Acidentes Pessoais</option>
                        <option value="DESCONHECIDO">Desconhecido</option>
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Passivos Financeiros</p>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">opcional</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Financiamentos, empréstimos e dívidas em aberto são adicionados ao capital necessário —
                      pois em caso de sinistro precisariam ser quitados.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Total de Dívidas" hint="Saldo devedor consolidado (imóvel, veículo, consignado etc.).">
                      <CurrencyInput value={debtTotal} onChange={setDebtTotal} placeholder="150.000" />
                    </Field>
                    <Field label="Prazo Restante" hint="Meses até quitar todas as dívidas listadas.">
                      <div className="relative">
                        <input
                          type="number" min="0"
                          value={debtMonths}
                          onChange={(e) => setDebtMonths(e.target.value)}
                          placeholder="Ex: 120"
                          className={`${cls()} pr-16`}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">meses</span>
                      </div>
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Family ── */}
            {step === 2 && (
              <div className="space-y-6">
                <Field
                  label="Número de Dependentes *"
                  hint="Filhos, cônjuge sem renda própria e outros que dependem financeiramente do segurado. Cada dependente acrescenta anos ao cálculo de proteção."
                >
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setDependentsCount((v) => String(Math.max(0, Number(v) - 1)))}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >−</button>
                    <div className="flex h-11 w-24 items-center justify-center rounded-xl border-2 border-indigo-200 bg-indigo-50 text-2xl font-bold text-indigo-700">
                      {dependentsCount}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDependentsCount((v) => String(Math.min(10, Number(v) + 1)))}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >+</button>
                    <span className="text-sm font-medium text-slate-600">
                      {Number(dependentsCount) === 0 ? 'Sem dependentes' :
                       Number(dependentsCount) === 1 ? '1 dependente' :
                       `${dependentsCount} dependentes`}
                    </span>
                  </div>
                </Field>

                {Number(dependentsCount) > 0 && (
                  <Field
                    label="Idades dos Dependentes"
                    hint="Informe a idade de cada um, separadas por vírgula. Dependentes mais jovens aumentam o horizonte de proteção necessário."
                  >
                    <input
                      type="text"
                      value={dependentsAges}
                      onChange={(e) => setDependentsAges(e.target.value)}
                      placeholder={`Ex: ${Array.from({ length: Math.min(Number(dependentsCount), 4) }, (_, i) => 5 + i * 4).join(', ')}`}
                      className={cls()}
                    />
                  </Field>
                )}

                <div className={`rounded-xl border p-4 ${
                  Number(dependentsCount) === 0
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-indigo-100 bg-indigo-50'
                }`}>
                  <p className={`mb-2 text-xs font-semibold ${Number(dependentsCount) === 0 ? 'text-slate-600' : 'text-indigo-800'}`}>
                    Como isso afeta o diagnóstico
                  </p>
                  <ul className={`space-y-1.5 text-xs ${Number(dependentsCount) === 0 ? 'text-slate-500' : 'text-indigo-700'}`}>
                    {Number(dependentsCount) === 0 ? (
                      <>
                        <li>• Motor usa multiplicador base para segurados sem dependentes.</li>
                        <li>• Capital recomendado tende a ser menor (foco na reposição da própria renda).</li>
                      </>
                    ) : (
                      <>
                        <li>• {dependentsCount} dependente(s): +{Math.min(Number(dependentsCount), 3)} anos de renda acrescidos ao cálculo base.</li>
                        <li>• A cobertura recomendada cobre os dependentes até a independência financeira.</li>
                        {dependentsAges && <li>• Idades informadas permitem ajuste fino no horizonte de proteção.</li>}
                      </>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* ── Step 3: Operational ── */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Canal de Origem *" hint="Canal pelo qual o diagnóstico está sendo registrado.">
                    <select value={channel} onChange={(e) => setChannel(e.target.value)} className={cls()}>
                      <option value="Web">Web</option>
                      <option value="Mobile">Mobile</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="API">API / Integração</option>
                      <option value="Presencial">Presencial</option>
                    </select>
                  </Field>
                  <Field
                    label="Última Revisão do Seguro"
                    hint="Revisões acima de 12 meses podem acionar a ação REVISAR no diagnóstico."
                  >
                    <div className="relative">
                      <input
                        type="number" min="0"
                        value={lastReviewMonthsAgo}
                        onChange={(e) => setLastReviewMonthsAgo(e.target.value)}
                        placeholder="Nunca revisado"
                        className={`${cls()} pr-20`}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">meses atrás</span>
                    </div>
                  </Field>
                </div>

                <Field
                  label="ID de Consentimento (LGPD) *"
                  hint="Identificador do consentimento registrado no seu sistema de privacidade. Obrigatório para conformidade com a LGPD."
                  error={fieldErrors.consentId}
                >
                  <input
                    type="text"
                    value={consentId}
                    onChange={(e) => { setConsentId(e.target.value); clearError('consentId') }}
                    className={cls(!!fieldErrors.consentId)}
                  />
                </Field>

                <div className="space-y-3">
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                    consent
                      ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                      : fieldErrors.consent
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => { setConsent(e.target.checked); clearError('consent') }}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${
                        consent ? 'text-emerald-800' : fieldErrors.consent ? 'text-red-700' : 'text-slate-800'
                      }`}>
                        Confirmo consentimento ativo do cliente (LGPD) *
                      </p>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        O cliente autorizou expressamente o processamento de seus dados para fins de diagnóstico
                        de proteção de vida. Sem consentimento ativo o motor rejeita a avaliação.
                      </p>
                      {fieldErrors.consent && (
                        <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.consent}</p>
                      )}
                    </div>
                  </label>

                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    hasUnconfirmed ? 'border-amber-200 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={hasUnconfirmed}
                      onChange={(e) => setHasUnconfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    <div>
                      <p className={`text-sm font-medium ${hasUnconfirmed ? 'text-amber-800' : 'text-slate-700'}`}>
                        Dados ainda não confirmados pelo cliente
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                        Marque quando os dados foram inseridos pelo corretor sem validação direta do segurado.
                        O motor pode emitir alerta de confiabilidade no diagnóstico gerado.
                      </p>
                    </div>
                  </label>
                </div>

                {submitError && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Navigation ── */}
            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
              <button
                onClick={() => { setStep((s) => s - 1); setFieldErrors({}) }}
                disabled={step === 0}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:invisible transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>

              <span className="text-xs text-slate-400 font-medium">{step + 1} / {STEPS.length}</span>

              {step < STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {loading ? 'Calculando…' : 'Gerar Diagnóstico'}
                  {!loading && <Send className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────

const PROFESSION_RISKS = [
  { value: 'BAIXO',      label: 'Baixo',      desc: 'Escritório, administrativo, TI', dot: 'bg-emerald-500' },
  { value: 'MEDIO',      label: 'Médio',      desc: 'Comércio, saúde, educação',      dot: 'bg-amber-500' },
  { value: 'ALTO',       label: 'Alto',       desc: 'Construção, logística, campo',   dot: 'bg-orange-500' },
  { value: 'MUITO_ALTO', label: 'Muito Alto', desc: 'Mineração, segurança, offshore', dot: 'bg-red-500' },
]

function cls(hasError = false) {
  return `w-full rounded-lg border ${
    hasError
      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
      : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'
  } bg-white px-3 py-2.5 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors`
}

function Field({
  label, hint, error, children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      {children}
      {hint && !error && <p className="text-[11px] leading-snug text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  )
}

function CurrencyInput({
  value, onChange, placeholder, hasError = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hasError?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
        R$
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={focused ? value : formatBRL(value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder={placeholder ?? '0'}
        className={`${cls(hasError)} pl-9`}
      />
    </div>
  )
}
