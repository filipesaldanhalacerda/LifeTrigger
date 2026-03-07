import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ChevronRight, ChevronLeft, Send, AlertCircle,
  Heart, Baby, Home, TrendingUp, Scissors, Sunset, Pencil,
  Info, Zap, User, Banknote, Users, ClipboardCheck,
  ChevronDown, Check, ShieldCheck, ShieldAlert, ShieldOff, Plus, Trash2,
  Calculator, GraduationCap,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { DatePicker } from '../components/ui/DateRangePicker'
import { postTrigger, getActiveTenantId } from '../lib/api'
import { generateIdempotencyKey } from '../lib/utils'
import type { LifeTriggerEvent } from '../types/api'

// ── Currency helpers ──────────────────────────────────────────────
function parseCurrency(raw: string): number {
  if (!raw) return 0
  const cents = parseInt(raw, 10) || 0
  return cents / 100
}

function formatCurrencyLive(raw: string): string {
  if (!raw) return ''
  const cents = parseInt(raw, 10) || 0
  const reais = cents / 100
  return reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Trigger type catalogue ────────────────────────────────────────
const TRIGGER_TYPES = [
  {
    value: 'Casamento', label: 'Casamento', desc: 'União matrimonial ou união estável',
    icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-300', ring: 'ring-pink-300',
    effect: 'Dependência financeira do cônjuge eleva o capital necessário. Motor acrescenta anos de reposição de renda.',
  },
  {
    value: 'NovoFilho', label: 'Novo Filho', desc: 'Nascimento ou adoção',
    icon: Baby, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-300', ring: 'ring-sky-300',
    effect: 'Cada novo dependente acrescenta anos ao horizonte de proteção e aumenta a cobertura recomendada.',
  },
  {
    value: 'Imovel', label: 'Aquisição de Imóvel', desc: 'Compra, financiamento ou permuta',
    icon: Home, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-300', ring: 'ring-brand-300',
    effect: 'Financiamentos são somados ao capital necessário — em caso de sinistro o imóvel precisa ser quitado.',
  },
  {
    value: 'Aumento_Salario', label: 'Aumento de Salário', desc: 'Promoção, novo emprego ou renda extra',
    icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-300', ring: 'ring-emerald-300',
    effect: 'Renda maior amplia o padrão de vida a proteger. A cobertura recomendada cresce proporcionalmente.',
  },
  {
    value: 'Divorcio', label: 'Divórcio / Separação', desc: 'Mudança no estado civil e estrutura familiar',
    icon: Scissors, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-300', ring: 'ring-amber-300',
    effect: 'Pode reduzir ou redirecionar a proteção. Motor reavalia dependentes e guarda dívidas compartilhadas.',
  },
  {
    value: 'Aposentadoria', label: 'Aposentadoria', desc: 'Transição de carreira ou saída do mercado',
    icon: Sunset, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-300', ring: 'ring-violet-300',
    effect: 'Renda previdenciária muda o perfil de necessidade. Motor verifica se manutenção ou redução de cobertura é adequada.',
  },
  {
    value: 'Personalizado', label: 'Evento Personalizado', desc: 'Outro evento de vida relevante',
    icon: Pencil, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-300', ring: 'ring-slate-300',
    effect: 'Motor roda diagnóstico completo com os dados informados. Use a descrição para registrar o contexto do evento.',
  },
]

// ── Step metadata ────────────────────────────────────────────────
const STEPS = [
  { label: 'Evento', icon: Zap, description: 'Tipo de gatilho de vida e data do evento' },
  { label: 'Pessoal', icon: User, description: 'Perfil demográfico e de risco do segurado' },
  { label: 'Família', icon: Users, description: 'Dependentes e estrutura familiar' },
  { label: 'Financeiro', icon: Banknote, description: 'Renda, cobertura atual e passivos financeiros' },
  { label: 'Consentimento', icon: ClipboardCheck, description: 'Consentimento LGPD e envio do diagnóstico' },
]

// ── Component ─────────────────────────────────────────────────────
export default function NewTrigger() {
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Trigger
  const [triggerType, setTriggerType] = useState('Casamento')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10))

  // Personal
  const [age, setAge] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [professionRisk, setProfessionRisk] = useState('BAIXO')
  const [isSmoker, setIsSmoker] = useState(false)

  // Family
  const [dependentsCount, setDependentsCount] = useState('0')
  const [dependentsAges, setDependentsAges] = useState<string[]>([])

  function setDepCount(delta: number) {
    const newCount = Math.max(0, Math.min(10, Number(dependentsCount) + delta))
    setDependentsCount(String(newCount))
    setDependentsAges((prev) =>
      newCount > prev.length
        ? [...prev, ...Array<string>(newCount - prev.length).fill('')]
        : prev.slice(0, newCount),
    )
    setEduTuitions((prev) =>
      newCount > prev.length
        ? [...prev, ...Array<string>(newCount - prev.length).fill('')]
        : prev.slice(0, newCount),
    )
  }

  function setDepAge(index: number, value: string) {
    setDependentsAges((prev) => prev.map((v, i) => (i === index ? value : v)))
    clearError(`depAge_${index}`)
  }

  // Financial
  const [income, setIncome] = useState('')
  const [policies, setPolicies] = useState([{ coverage: '', policyType: '' }])
  const [debtTotal, setDebtTotal] = useState('')
  const [debtMonths, setDebtMonths] = useState('')
  const [emergencyFund, setEmergencyFund] = useState('')
  const [educationCost, setEducationCost] = useState('')
  const [eduMode, setEduMode] = useState<'manual' | 'calc'>('calc')
  const [eduTuitions, setEduTuitions] = useState<string[]>([])
  const [eduAnnualIncrease, setEduAnnualIncrease] = useState('8')
  const [eduTargetAge, setEduTargetAge] = useState('21')
  const [estateValue, setEstateValue] = useState('')
  const [estateState, setEstateState] = useState('')

  // Consent
  const [consent, setConsent] = useState(false)
  const [consentId] = useState(`consent-trigger-${Date.now()}`)

  const activeTrigger = TRIGGER_TYPES.find((t) => t.value === triggerType)!

  // Pre-fill from evaluation when navigating from EvaluationResult
  useEffect(() => {
    const prefill = (location.state as { prefill?: import('../types/api').LifeInsuranceAssessmentRequest })?.prefill
    if (!prefill) return

    // Personal
    setAge(String(prefill.personalContext.age || ''))
    setMaritalStatus(prefill.personalContext.maritalStatus || '')
    setProfessionRisk(prefill.personalContext.professionRiskLevel || 'BAIXO')
    setIsSmoker(prefill.personalContext.isSmoker ?? false)

    // Family
    const depCount = prefill.familyContext.dependentsCount || 0
    setDependentsCount(String(depCount))
    const ages = (prefill.familyContext.dependentsAges || []).map(String)
    setDependentsAges(ages.length >= depCount ? ages.slice(0, depCount) : [...ages, ...Array(depCount - ages.length).fill('')])
    setEduTuitions(Array(depCount).fill(''))

    // Financial
    const monthlyIncome = prefill.financialContext.monthlyIncome?.exactValue
    if (monthlyIncome) setIncome(String(Math.round(monthlyIncome * 100)))

    const pols = prefill.financialContext.policies
    if (pols && pols.length > 0) {
      setPolicies(pols.map((p) => ({
        coverage: p.coverageAmount ? String(Math.round(p.coverageAmount * 100)) : '',
        policyType: p.policyType || '',
      })))
    }

    if (prefill.financialContext.debts?.totalAmount) {
      setDebtTotal(String(Math.round(prefill.financialContext.debts.totalAmount * 100)))
      if (prefill.financialContext.debts.remainingTermMonths) {
        setDebtMonths(String(prefill.financialContext.debts.remainingTermMonths))
      }
    }

    if (prefill.financialContext.emergencyFundMonths != null) {
      setEmergencyFund(String(prefill.financialContext.emergencyFundMonths))
    }

    if (prefill.financialContext.educationCosts?.totalEstimatedCost) {
      setEducationCost(String(Math.round(prefill.financialContext.educationCosts.totalEstimatedCost * 100)))
      setEduMode('manual')
    }

    if (prefill.financialContext.estate?.totalEstateValue) {
      setEstateValue(String(Math.round(prefill.financialContext.estate.totalEstateValue * 100)))
      if (prefill.financialContext.estate.state) {
        setEstateState(prefill.financialContext.estate.state)
      }
    }

    // Consent already given in original evaluation
    setConsent(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      if (!eventDate) errors.eventDate = 'A data do evento é obrigatória.'
    }
    if (s === 1) {
      const ageNum = Number(age)
      if (!age.trim()) errors.age = 'Idade é obrigatória.'
      else if (ageNum < 18 || ageNum > 99) errors.age = 'Deve estar entre 18 e 99 anos.'
    }
    if (s === 2) {
      const count = Number(dependentsCount)
      if (count > 0) {
        dependentsAges.forEach((a, i) => {
          const n = Number(a)
          if (!a.trim()) errors[`depAge_${i}`] = `Informe a idade do dependente ${i + 1}.`
          else if (n < 0 || n > 99) errors[`depAge_${i}`] = 'Idade inválida (0–99 anos).'
        })
      }
    }
    if (s === 3) {
      if (parseCurrency(income) === 0) errors.income = 'Renda mensal é obrigatória e deve ser maior que zero.'
    }
    if (s === 4) {
      if (!consent) errors.consent = 'Consentimento ativo do cliente é obrigatório (LGPD).'
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
    const errors = validateStep(4)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    setSubmitError(null)
    try {
      const event: LifeTriggerEvent = {
        triggerType,
        description: description.trim() || activeTrigger.label,
        eventDate: new Date(eventDate).toISOString(),
        baseRequest: {
          personalContext: {
            age: Number(age),
            maritalStatus: maritalStatus as never || undefined,
            professionRiskLevel: professionRisk as never,
            isSmoker,
          },
          financialContext: {
            monthlyIncome: { exactValue: parseCurrency(income) },
            policies: policies
              .filter((p) => p.coverage && parseCurrency(p.coverage) > 0)
              .map((p) => ({
                coverageAmount: parseCurrency(p.coverage),
                policyType: (p.policyType as never) || undefined,
              })),
            debts: debtTotal ? {
              totalAmount: parseCurrency(debtTotal),
              remainingTermMonths: debtMonths ? Number(debtMonths) : undefined,
            } : undefined,
            emergencyFundMonths: emergencyFund ? Number(emergencyFund) : undefined,
            educationCosts: educationCost && parseCurrency(educationCost) > 0
              ? { totalEstimatedCost: parseCurrency(educationCost) }
              : undefined,
            estate: estateValue && parseCurrency(estateValue) > 0
              ? { totalEstateValue: parseCurrency(estateValue), state: estateState || undefined }
              : undefined,
          },
          familyContext: {
            dependentsCount: Number(dependentsCount),
            dependentsAges: dependentsAges
              .map((a) => parseInt(a, 10))
              .filter((n) => !isNaN(n)),
          },
          operationalData: {
            originChannel: 'Web',
            hasExplicitActiveConsent: consent,
            consentId,
            tenantId: getActiveTenantId() ?? undefined,
          },
        },
      }
      const result = await postTrigger(event, generateIdempotencyKey())
      sessionStorage.setItem('lt_last_result', JSON.stringify(result))
      navigate('/evaluations/result')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao registrar gatilho.')
    } finally {
      setLoading(false)
    }
  }

  const StepIcon = STEPS[step].icon
  const progress = (step / (STEPS.length - 1)) * 100

  return (
    <div>
      <TopBar
        title="Gatilhos de Vida"
        subtitle="Registre um evento e receba novo diagnóstico de proteção"
      />

      <div className="p-4 sm:p-6 animate-fadeIn">
        <div className="mx-auto max-w-2xl space-y-4 sm:space-y-5">

          {/* ── Stepper ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Progresso</span>
              <span>Passo {step + 1} de {STEPS.length}</span>
            </div>
            <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full bg-brand-600 transition-all duration-500"
                style={{ width: step === 0 ? '8%' : `${progress}%` }}
              />
            </div>
            <div className="relative flex items-start justify-between">
              <div className="absolute top-[18px] left-0 right-0 mx-auto h-0.5 bg-slate-200" style={{ left: '10%', right: '10%' }} />
              <div
                className="absolute top-[18px] h-0.5 bg-brand-600 transition-all duration-500"
                style={{
                  left: '10%',
                  width: step === 0 ? '0%' : `${(step / (STEPS.length - 1)) * 80}%`,
                }}
              />
              {STEPS.map((s, i) => {
                const Icon = s.icon
                const done = i < step
                const active = i === step
                return (
                  <div key={i} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                      done   ? 'border-brand-600 bg-brand-600 text-white' :
                      active ? 'border-brand-600 bg-white text-brand-600 shadow-sm' :
                               'border-slate-200 bg-slate-50 text-slate-400'
                    }`}>
                      {done ? '✓' : <Icon className="h-4 w-4" />}
                    </div>
                    <span className={`text-center text-[10px] font-medium leading-tight ${
                      active ? 'text-brand-700' : done ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Step header ── */}
          <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 to-white px-4 sm:px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-sm">
              <StepIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-900">{STEPS[step].label}</p>
              <p className="text-xs text-brand-600">{STEPS[step].description}</p>
            </div>
          </div>

          {/* ── Form card ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-card">

            {/* ── Step 0: Trigger Event ── */}
            {step === 0 && (
              <div className="space-y-6">
                {/* Explainer */}
                <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50/50 to-white p-4">
                  <Zap className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <p className="text-xs leading-relaxed text-brand-700">
                    Grandes eventos mudam a necessidade de proteção — casamento, filhos, imóvel ou promoção criam novos riscos.
                    O motor recalcula automaticamente o capital segurado ideal com base no novo contexto de vida.
                  </p>
                </div>

                {/* Trigger type grid */}
                <div>
                  <p className="mb-3 text-xs font-semibold text-slate-600">Tipo de Evento de Vida *</p>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
                    {TRIGGER_TYPES.map((t) => {
                      const Icon = t.icon
                      const active = triggerType === t.value
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setTriggerType(t.value)}
                          className={`rounded-xl border p-3.5 text-left transition-all ${
                            active
                              ? `${t.border} ${t.bg} ring-1 ${t.ring} shadow-sm`
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${active ? t.bg : 'bg-slate-100'}`}>
                              <Icon className={`h-4 w-4 ${active ? t.color : 'text-slate-400'}`} />
                            </div>
                            <span className={`text-xs font-semibold ${active ? t.color : 'text-slate-700'}`}>
                              {t.label}
                            </span>
                          </div>
                          <p className="text-[11px] leading-snug text-slate-500">{t.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Effect explanation */}
                <div className={`flex items-start gap-2.5 rounded-lg border p-3 ${activeTrigger.border} ${activeTrigger.bg}`}>
                  <Info className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${activeTrigger.color}`} />
                  <p className={`text-xs leading-relaxed ${activeTrigger.color}`}>
                    <span className="font-semibold">Impacto no diagnóstico: </span>
                    {activeTrigger.effect}
                  </p>
                </div>

                {/* Event details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Data do Evento *"
                    hint="Quando o evento ocorreu ou ocorrerá."
                    error={fieldErrors.eventDate}
                  >
                    <DatePicker
                      value={eventDate}
                      onChange={(d) => { setEventDate(d); clearError('eventDate') }}
                      placeholder="Selecione a data"
                      error={!!fieldErrors.eventDate}
                    />
                  </Field>
                  <Field
                    label="Descrição do Evento"
                    hint="Contexto adicional registrado no diagnóstico. Opcional."
                  >
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={`Ex: ${activeTrigger.desc}`}
                      className={cls()}
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* ── Step 1: Personal ── */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PROFESSION_RISKS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setProfessionRisk(opt.value)}
                        className={`rounded-xl border p-3.5 text-left transition-all ${
                          professionRisk === opt.value
                            ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-400'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`h-2 w-2 rounded-full ${opt.dot}`} />
                          <p className={`text-xs font-semibold ${professionRisk === opt.value ? 'text-brand-700' : 'text-slate-700'}`}>
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
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
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
                      onClick={() => setDepCount(-1)}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >−</button>
                    <div className="flex h-11 w-24 items-center justify-center rounded-xl border-2 border-brand-200 bg-brand-50 text-2xl font-bold text-brand-700">
                      {dependentsCount}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDepCount(+1)}
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
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Idade de cada dependente *</p>
                    <p className="text-[11px] text-slate-400">
                      Dependentes mais jovens aumentam o horizonte de proteção calculado pelo motor.
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {dependentsAges.map((depAge, i) => (
                        <div key={i} className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-slate-500">Dependente {i + 1}</label>
                          <div className="relative">
                            <input
                              type="number" min="0" max="99"
                              value={depAge}
                              onChange={(e) => setDepAge(i, e.target.value)}
                              placeholder="Ex: 8"
                              className={`${cls(!!fieldErrors[`depAge_${i}`])} pr-14`}
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">anos</span>
                          </div>
                          {fieldErrors[`depAge_${i}`] && (
                            <p className="text-[11px] font-semibold text-red-600">{fieldErrors[`depAge_${i}`]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`rounded-xl border p-4 ${
                  Number(dependentsCount) === 0
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-brand-100 bg-brand-50'
                }`}>
                  <p className={`mb-2 text-xs font-semibold ${Number(dependentsCount) === 0 ? 'text-slate-600' : 'text-brand-800'}`}>
                    Como isso afeta o diagnóstico
                  </p>
                  <ul className={`space-y-1.5 text-xs ${Number(dependentsCount) === 0 ? 'text-slate-500' : 'text-brand-700'}`}>
                    {Number(dependentsCount) === 0 ? (
                      <>
                        <li>• Motor usa multiplicador base para segurados sem dependentes.</li>
                        <li>• Capital recomendado tende a ser menor (foco na reposição da própria renda).</li>
                      </>
                    ) : (
                      <>
                        <li>• {dependentsCount} {Number(dependentsCount) === 1 ? 'dependente' : 'dependentes'}: +{Math.min(Number(dependentsCount), 3)} {Math.min(Number(dependentsCount), 3) === 1 ? 'ano de renda acrescido' : 'anos de renda acrescidos'} ao cálculo base.</li>
                        <li>• A cobertura recomendada cobre os dependentes até a independência financeira.</li>
                        {dependentsAges.some((a) => a) && <li>• Idades informadas permitem ajuste fino no horizonte de proteção.</li>}
                      </>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* ── Step 3: Financial ── */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Renda Mensal Bruta *"
                    hint="Principal parâmetro do cálculo. O motor multiplica a renda anual por um fator de anos de reposição."
                    error={fieldErrors.income}
                  >
                    <CurrencyInput
                      value={income}
                      onChange={(v) => { setIncome(v); clearError('income') }}
                      placeholder="10.000,00"
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

                {/* Policies */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Seguros de Vida Atuais</p>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">opcional</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Preencha todas as apólices vigentes do cliente. O motor soma a cobertura efetiva de cada uma
                      e calcula o gap total. Deixe em branco se não tiver seguro.
                    </p>
                  </div>

                  {policies.map((policy, idx) => (
                    <div key={idx} className="space-y-3">
                      {policies.length > 1 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-500">Apólice {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => setPolicies(policies.filter((_, i) => i !== idx))}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remover
                          </button>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Capital Segurado" hint="Valor total da cobertura desta apólice.">
                          <CurrencyInput
                            value={policy.coverage}
                            onChange={(v) => {
                              const next = [...policies]
                              next[idx] = { ...next[idx], coverage: v }
                              setPolicies(next)
                            }}
                            placeholder="200.000,00"
                          />
                        </Field>
                        <Field label="Tipo de Apólice" hint="Modalidade contratual. Afeta como o motor contabiliza a cobertura.">
                          <PolicyTypeSelector
                            value={policy.policyType}
                            onChange={(v) => {
                              const next = [...policies]
                              next[idx] = { ...next[idx], policyType: v }
                              setPolicies(next)
                            }}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPolicies([...policies, { coverage: '', policyType: '' }])}
                    className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-colors w-full justify-center"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar outra apólice
                  </button>
                </div>

                {/* Debts */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Passivos Financeiros</p>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">opcional</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Financiamentos, empréstimos e dívidas em aberto são adicionados ao capital necessário.
                    </p>
                  </div>
                  <Field label="Total de Dívidas" hint="Saldo devedor consolidado (imóvel, veículo, consignado etc.).">
                    <CurrencyInput value={debtTotal} onChange={setDebtTotal} placeholder="150.000,00" />
                  </Field>
                  {debtTotal && parseCurrency(debtTotal) > 0 && (
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
                  )}
                </div>

                {/* Education — conditional on dependents */}
                {Number(dependentsCount) > 0 && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <GraduationCap className="h-4 w-4 text-slate-500" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Custos de Educação</p>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">opcional</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Custo total estimado de educação {Number(dependentsCount) === 1 ? `do ${dependentsCount} dependente` : `dos ${dependentsCount} dependentes`} (escola, faculdade, cursos).
                        O motor adiciona esse valor ao capital segurado recomendado.
                      </p>
                    </div>

                    {/* Mode toggle */}
                    <div className="flex gap-1 rounded-lg bg-slate-200/60 p-0.5">
                      <button
                        type="button"
                        onClick={() => setEduMode('calc')}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                          eduMode === 'calc' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Calculator className="h-3.5 w-3.5" />
                        Calculadora
                      </button>
                      <button
                        type="button"
                        onClick={() => setEduMode('manual')}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                          eduMode === 'manual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Valor manual
                      </button>
                    </div>

                    {eduMode === 'calc' ? (
                      <div className="space-y-4">
                        {/* Per-dependent tuition */}
                        <div className="space-y-3">
                          {dependentsAges.map((depAge, i) => {
                            const ageNum = Number(depAge) || 0
                            const targetNum = Number(eduTargetAge) || 21
                            const yearsLeft = Math.max(0, targetNum - ageNum)
                            return (
                              <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-700">
                                    Dependente {i + 1} — {ageNum > 0 ? `${ageNum} anos` : 'idade não informada'}
                                  </span>
                                  <span className="text-[10px] font-medium text-slate-400">
                                    {yearsLeft > 0 ? `${yearsLeft} anos restantes` : 'já formado'}
                                  </span>
                                </div>
                                <Field label="Mensalidade escolar/faculdade" hint="">
                                  <CurrencyInput
                                    value={eduTuitions[i] || ''}
                                    onChange={(v) => {
                                      setEduTuitions((prev) => prev.map((t, j) => (j === i ? v : t)))
                                    }}
                                    placeholder="2.500,00"
                                  />
                                </Field>
                              </div>
                            )
                          })}
                        </div>

                        {/* Calculator params */}
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Reajuste anual" hint="">
                            <div className="relative">
                              <input
                                type="number" min="0" max="30" step="1"
                                value={eduAnnualIncrease}
                                onChange={(e) => setEduAnnualIncrease(e.target.value)}
                                className={`${cls()} pr-8`}
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                            </div>
                          </Field>
                          <Field label="Idade limite" hint="">
                            <div className="relative">
                              <input
                                type="number" min="16" max="30"
                                value={eduTargetAge}
                                onChange={(e) => setEduTargetAge(e.target.value)}
                                className={`${cls()} pr-12`}
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">anos</span>
                            </div>
                          </Field>
                        </div>

                        {/* Computed total */}
                        {(() => {
                          const rate = (Number(eduAnnualIncrease) || 0) / 100
                          const target = Number(eduTargetAge) || 21
                          let total = 0
                          dependentsAges.forEach((depAge, i) => {
                            const ageNum = Number(depAge) || 0
                            const monthlyTuition = parseCurrency(eduTuitions[i] || '')
                            if (monthlyTuition <= 0) return
                            const yearsLeft = Math.max(0, target - ageNum)
                            for (let y = 0; y < yearsLeft; y++) {
                              total += monthlyTuition * 12 * Math.pow(1 + rate, y)
                            }
                          })
                          const totalCents = Math.round(total * 100)
                          // Sync to educationCost state
                          if (String(totalCents) !== educationCost) {
                            setTimeout(() => setEducationCost(totalCents > 0 ? String(totalCents) : ''), 0)
                          }
                          return total > 0 ? (
                            <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
                              <div>
                                <p className="text-xs font-medium text-brand-700">Total estimado de educação</p>
                                <p className="text-[10px] text-brand-500">
                                  Reajuste de {eduAnnualIncrease}% a.a. até os {eduTargetAge} anos
                                </p>
                              </div>
                              <p className="text-base font-bold tabular-nums text-brand-800">
                                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          ) : null
                        })()}
                      </div>
                    ) : (
                      <Field label="Custo Total Estimado" hint="Soma de mensalidades até a formação de todos os dependentes.">
                        <CurrencyInput value={educationCost} onChange={setEducationCost} placeholder="200.000,00" />
                      </Field>
                    )}
                  </div>
                )}

                {/* Estate */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Patrimônio e Sucessão</p>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">opcional</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Valor total do patrimônio (imóveis, investimentos, bens). O motor calcula
                      automaticamente o ITCMD (imposto estadual sobre herança) e custos de inventário.
                    </p>
                  </div>
                  <Field label="Valor Total do Patrimônio" hint="Soma de imóveis, veículos, investimentos e outros bens.">
                    <CurrencyInput value={estateValue} onChange={setEstateValue} placeholder="1.000.000,00" />
                  </Field>
                  {estateValue && parseCurrency(estateValue) > 0 && (
                    <Field label="Estado (UF)" hint="O ITCMD varia de 2% a 8% conforme o estado. Alíquota padrão: 4%.">
                      <StateCombobox value={estateState} onChange={setEstateState} />
                    </Field>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 4: Consent ── */}
            {step === 4 && (
              <div className="space-y-6">
                {/* Summary of trigger */}
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activeTrigger.bg}`}>
                    {(() => { const Icon = activeTrigger.icon; return <Icon className={`h-5 w-5 ${activeTrigger.color}`} /> })()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{activeTrigger.label}</p>
                    <p className="text-xs text-slate-500">
                      {eventDate ? new Date(eventDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data não informada'}
                      {description && ` — ${description}`}
                    </p>
                  </div>
                </div>

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
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${
                      consent ? 'text-emerald-800' : fieldErrors.consent ? 'text-red-700' : 'text-slate-800'
                    }`}>
                      Confirmo consentimento ativo do cliente (LGPD) *
                    </p>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      O cliente autorizou expressamente o processamento de seus dados para fins de diagnóstico
                      de proteção de vida associado a este evento. Sem consentimento ativo o motor rejeita o registro.
                    </p>
                    {fieldErrors.consent && (
                      <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.consent}</p>
                    )}
                  </div>
                </label>

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
                type="button"
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
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {loading ? 'Calculando…' : 'Registrar e Calcular'}
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

// ── Sub-components & constants ────────────────────────────────────

const PROFESSION_RISKS = [
  { value: 'BAIXO',      label: 'Baixo',      desc: 'Escritório, administrativo, TI', dot: 'bg-emerald-500' },
  { value: 'MEDIO',      label: 'Médio',      desc: 'Comércio, saúde, educação',      dot: 'bg-amber-500' },
  { value: 'ALTO',       label: 'Alto',       desc: 'Construção, logística, campo',   dot: 'bg-orange-500' },
  { value: 'MUITO_ALTO', label: 'Muito Alto', desc: 'Mineração, segurança, offshore', dot: 'bg-red-500' },
]

const BR_STATES = [
  { uf: 'AC', name: 'Acre', rate: 4 }, { uf: 'AL', name: 'Alagoas', rate: 4 },
  { uf: 'AM', name: 'Amazonas', rate: 4 }, { uf: 'AP', name: 'Amapá', rate: 4 },
  { uf: 'BA', name: 'Bahia', rate: 8 }, { uf: 'CE', name: 'Ceará', rate: 8 },
  { uf: 'DF', name: 'Distrito Federal', rate: 6 }, { uf: 'ES', name: 'Espírito Santo', rate: 4 },
  { uf: 'GO', name: 'Goiás', rate: 8 }, { uf: 'MA', name: 'Maranhão', rate: 7 },
  { uf: 'MG', name: 'Minas Gerais', rate: 5 }, { uf: 'MS', name: 'Mato Grosso do Sul', rate: 6 },
  { uf: 'MT', name: 'Mato Grosso', rate: 8 }, { uf: 'PA', name: 'Pará', rate: 6 },
  { uf: 'PB', name: 'Paraíba', rate: 8 }, { uf: 'PE', name: 'Pernambuco', rate: 8 },
  { uf: 'PI', name: 'Piauí', rate: 6 }, { uf: 'PR', name: 'Paraná', rate: 4 },
  { uf: 'RJ', name: 'Rio de Janeiro', rate: 8 }, { uf: 'RN', name: 'Rio Grande do Norte', rate: 6 },
  { uf: 'RO', name: 'Rondônia', rate: 4 }, { uf: 'RR', name: 'Roraima', rate: 4 },
  { uf: 'RS', name: 'Rio Grande do Sul', rate: 6 }, { uf: 'SC', name: 'Santa Catarina', rate: 8 },
  { uf: 'SE', name: 'Sergipe', rate: 8 }, { uf: 'SP', name: 'São Paulo', rate: 8 },
  { uf: 'TO', name: 'Tocantins', rate: 8 },
]

function cls(hasError = false) {
  return `w-full rounded-lg border ${
    hasError
      ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
      : 'border-slate-200 focus:border-brand-400 focus:ring-brand-100'
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
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
        R$
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={formatCurrencyLive(value)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder={placeholder ?? '0,00'}
        className={`${cls(hasError)} pl-9`}
      />
    </div>
  )
}

function StateCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = search
    ? BR_STATES.filter(
        (s) =>
          s.uf.toLowerCase().includes(search.toLowerCase()) ||
          s.name.toLowerCase().includes(search.toLowerCase()),
      )
    : BR_STATES

  const selected = BR_STATES.find((s) => s.uf === value)

  function pick(uf: string) {
    onChange(uf)
    setSearch('')
    setOpen(false)
  }

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setOpen(false)
          setSearch('')
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${cls()} flex items-center justify-between text-left`}
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected ? `${selected.uf} — ${selected.name} (${selected.rate}%)` : 'Não informado (4% padrão)'}
        </span>
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div className="absolute z-50 bottom-full mb-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="p-2">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar estado..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto px-1 pb-1">
            <li>
              <button
                type="button"
                onClick={() => pick('')}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${!value ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-600'}`}
              >
                Não informado (4% padrão)
              </button>
            </li>
            {filtered.map((s) => (
              <li key={s.uf}>
                <button
                  type="button"
                  onClick={() => pick(s.uf)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${value === s.uf ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'}`}
                >
                  <span className="font-medium">{s.uf}</span>
                  <span className="text-slate-500"> — {s.name}</span>
                  <span className="ml-1 text-xs text-slate-400">({s.rate}%)</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">Nenhum estado encontrado</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

const POLICY_TYPE_OPTIONS = [
  {
    value: '', label: 'Não informado',
    desc: 'O cliente não sabe ou não informou o tipo. O motor assumirá cobertura integral.',
    icon: ShieldCheck, color: 'text-slate-400', bg: 'bg-slate-50', ring: 'ring-slate-200',
  },
  {
    value: 'TEMPORARIO', label: 'Vida Temporário',
    desc: 'Seguro com prazo fixo (ex: 10, 20 anos). Cobertura plena por morte de qualquer causa durante a vigência.',
    icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200',
  },
  {
    value: 'VIDA_INTEIRA', label: 'Vida Inteira',
    desc: 'Cobertura permanente, sem prazo de vencimento. Protege a família contra morte por qualquer causa, por toda a vida.',
    icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200',
  },
  {
    value: 'RESGATAVEL', label: 'Vida Resgatável',
    desc: 'Seguro de vida com componente de poupança. Cobertura plena + valor de resgate acumulado ao longo do tempo.',
    icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200',
  },
  {
    value: 'GRUPO_EMPRESARIAL', label: 'Vida em Grupo / Empresarial',
    desc: 'Apólice coletiva oferecida pelo empregador. Cobertura plena, mas há risco de perda se o segurado sair da empresa.',
    icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200',
  },
  {
    value: 'ACIDENTES_PESSOAIS', label: 'Somente Acidentes Pessoais',
    desc: 'Cobre apenas morte acidental — não é seguro de vida. Cerca de 70% das mortes são por causas naturais e não seriam cobertas.',
    icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200',
  },
  {
    value: 'PRESTAMISTA', label: 'Prestamista',
    desc: 'Vinculado a financiamento — paga o credor, não a família. Não protege os dependentes e o motor desconsidera essa cobertura.',
    icon: ShieldOff, color: 'text-red-500', bg: 'bg-red-50', ring: 'ring-red-200',
  },
] as const

function PolicyTypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = POLICY_TYPE_OPTIONS.find((o) => o.value === value) ?? POLICY_TYPE_OPTIONS[0]

  function pick(v: string) {
    onChange(v)
    setOpen(false)
  }

  const Icon = selected.icon

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${cls()} flex items-center justify-between gap-2 text-left`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Icon className={`h-4 w-4 shrink-0 ${selected.color}`} />
          <span className={value ? 'text-slate-900 truncate' : 'text-slate-400 truncate'}>
            {selected.label}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 bottom-full mb-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-[420px] overflow-y-auto">
          <div className="p-1.5 space-y-1">
            {POLICY_TYPE_OPTIONS.map((opt) => {
              const OptIcon = opt.icon
              const isSelected = value === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => pick(opt.value)}
                  className={`w-full rounded-lg p-3 text-left transition-all hover:ring-1 ${opt.ring} ${
                    isSelected ? `${opt.bg} ring-1 ${opt.ring}` : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <OptIcon className={`h-4 w-4 mt-0.5 shrink-0 ${opt.color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                          {opt.label}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-brand-600 ml-auto shrink-0" />}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
