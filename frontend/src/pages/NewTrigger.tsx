import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send, AlertCircle, Heart, Baby, Home, TrendingUp,
  Scissors, Sunset, Pencil, Info, Zap,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { postTrigger, getActiveTenantId } from '../lib/api'
import { generateIdempotencyKey } from '../lib/utils'
import type { LifeTriggerEvent } from '../types/api'

// ── Currency helpers ──────────────────────────────────────────────
function parseCurrency(raw: string): number {
  return Number(raw.replace(/\D/g, '')) || 0
}

function formatBRL(raw: string): string {
  const n = parseCurrency(raw)
  if (!n) return ''
  return new Intl.NumberFormat('pt-BR').format(n)
}

// ── Trigger type catalogue ────────────────────────────────────────
const TRIGGER_TYPES = [
  {
    value: 'Casamento',
    label: 'Casamento',
    desc: 'União matrimonial ou união estável',
    icon: Heart,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-300',
    ring: 'ring-pink-300',
    effect: 'Dependência financeira do cônjuge eleva o capital necessário. Motor acrescenta anos de reposição de renda.',
  },
  {
    value: 'NovoFilho',
    label: 'Novo Filho',
    desc: 'Nascimento ou adoção',
    icon: Baby,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-300',
    ring: 'ring-sky-300',
    effect: 'Cada novo dependente acrescenta anos ao horizonte de proteção e aumenta a cobertura recomendada.',
  },
  {
    value: 'Imovel',
    label: 'Aquisição de Imóvel',
    desc: 'Compra, financiamento ou permuta',
    icon: Home,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-300',
    ring: 'ring-indigo-300',
    effect: 'Financiamentos são somados ao capital necessário — em caso de sinistro o imóvel precisa ser quitado.',
  },
  {
    value: 'Aumento_Salario',
    label: 'Aumento de Salário',
    desc: 'Promoção, novo emprego ou renda extra',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    ring: 'ring-emerald-300',
    effect: 'Renda maior amplia o padrão de vida a proteger. A cobertura recomendada cresce proporcionalmente.',
  },
  {
    value: 'Divorcio',
    label: 'Divórcio / Separação',
    desc: 'Mudança no estado civil e estrutura familiar',
    icon: Scissors,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    ring: 'ring-amber-300',
    effect: 'Pode reduzir ou redirecionar a proteção. Motor reavalia dependentes e guarda dívidas compartilhadas.',
  },
  {
    value: 'Aposentadoria',
    label: 'Aposentadoria',
    desc: 'Transição de carreira ou saída do mercado',
    icon: Sunset,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-300',
    ring: 'ring-violet-300',
    effect: 'Renda previdenciária muda o perfil de necessidade. Motor verifica se manutenção ou redução de cobertura é adequada.',
  },
  {
    value: 'Personalizado',
    label: 'Evento Personalizado',
    desc: 'Outro evento de vida relevante',
    icon: Pencil,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    ring: 'ring-slate-300',
    effect: 'Motor roda diagnóstico completo com os dados informados. Use a descrição para registrar o contexto do evento.',
  },
]

// ── Component ─────────────────────────────────────────────────────
export default function NewTrigger() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Trigger
  const [triggerType, setTriggerType] = useState('Casamento')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10))

  // Client context
  const [age, setAge] = useState('')
  const [income, setIncome] = useState('')
  const [dependentsCount, setDependentsCount] = useState('0')
  const [currentCoverage, setCurrentCoverage] = useState('')
  const [debtTotal, setDebtTotal] = useState('')
  const [professionRisk, setProfessionRisk] = useState('BAIXO')
  const [isSmoker, setIsSmoker] = useState(false)
  const [consent, setConsent] = useState(false)
  const [consentId] = useState(`consent-trigger-${Date.now()}`)

  const activeTrigger = TRIGGER_TYPES.find((t) => t.value === triggerType)!

  function clearError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!eventDate) errors.eventDate = 'A data do evento é obrigatória.'
    const ageNum = Number(age)
    if (!age.trim()) errors.age = 'Idade é obrigatória.'
    else if (ageNum < 18 || ageNum > 99) errors.age = 'Deve estar entre 18 e 99 anos.'
    if (parseCurrency(income) === 0) errors.income = 'Renda mensal é obrigatória e deve ser maior que zero.'
    if (!consent) errors.consent = 'Consentimento ativo do cliente é obrigatório (LGPD).'
    return errors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    setSubmitError(null)
    try {
      const event: LifeTriggerEvent = {
        triggerType,
        description: description.trim() || (activeTrigger.label),
        eventDate: new Date(eventDate).toISOString(),
        baseRequest: {
          personalContext: {
            age: Number(age),
            professionRiskLevel: professionRisk as never,
            isSmoker,
          },
          financialContext: {
            monthlyIncome: { exactValue: parseCurrency(income) },
            currentLifeInsurance: currentCoverage
              ? { coverageAmount: parseCurrency(currentCoverage) }
              : undefined,
            debts: debtTotal
              ? { totalAmount: parseCurrency(debtTotal) }
              : undefined,
          },
          familyContext: { dependentsCount: Number(dependentsCount) },
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

  return (
    <div>
      <TopBar
        title="Gatilhos de Vida"
        subtitle="Registre um evento e receba novo diagnóstico de proteção"
      />

      <div className="p-6">
        <div className="mx-auto max-w-2xl space-y-5">

          {/* ── Explainer banner ── */}
          <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-900">O que são Gatilhos de Vida?</p>
              <p className="mt-1 text-xs leading-relaxed text-indigo-700">
                Grandes eventos mudam instantaneamente a necessidade de proteção de uma pessoa —
                um casamento, um filho, a compra de um imóvel ou uma promoção criam novos riscos financeiros.
                Ao registrar o evento aqui, o motor recalcula automaticamente o capital segurado ideal
                com base no novo contexto de vida do cliente e entrega um diagnóstico atualizado.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── Trigger type grid ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Tipo de Evento de Vida</h2>
                <span className="text-xs text-slate-400">Selecione o gatilho</span>
              </div>
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

              {/* Effect explanation for selected trigger */}
              <div className={`mt-4 flex items-start gap-2.5 rounded-lg border p-3 ${activeTrigger.border} ${activeTrigger.bg}`}>
                <Info className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${activeTrigger.color}`} />
                <p className={`text-xs leading-relaxed ${activeTrigger.color}`}>
                  <span className="font-semibold">Impacto no diagnóstico: </span>
                  {activeTrigger.effect}
                </p>
              </div>
            </div>

            {/* ── Event details ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Detalhes do Evento</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Data do Evento *"
                  hint="Quando o evento ocorreu ou ocorrerá. Registrada no histórico do diagnóstico."
                  error={fieldErrors.eventDate}
                >
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => { setEventDate(e.target.value); clearError('eventDate') }}
                    className={cls(!!fieldErrors.eventDate)}
                  />
                </Field>
                <Field
                  label="Descrição do Evento"
                  hint="Contexto adicional que ficará registrado no diagnóstico. Opcional."
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

            {/* ── Client context ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Dados Atuais do Cliente</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Informe o perfil do cliente no momento do evento. O motor usa esses dados para gerar o novo diagnóstico.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Idade *"
                  hint="Afeta o multiplicador de risco etário do motor."
                  error={fieldErrors.age}
                >
                  <input
                    type="number"
                    min="18"
                    max="99"
                    value={age}
                    onChange={(e) => { setAge(e.target.value); clearError('age') }}
                    placeholder="Ex: 35"
                    className={cls(!!fieldErrors.age)}
                  />
                </Field>

                <Field
                  label="Renda Mensal Bruta *"
                  hint="Principal base do cálculo. Motor multiplica pela renda anual."
                  error={fieldErrors.income}
                >
                  <CurrencyInput
                    value={income}
                    onChange={(v) => { setIncome(v); clearError('income') }}
                    placeholder="10.000"
                    hasError={!!fieldErrors.income}
                  />
                </Field>
              </div>

              {/* Dependents counter */}
              <Field
                label="Número de Dependentes"
                hint="Cada dependente acrescenta anos ao horizonte de proteção calculado pelo motor."
              >
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setDependentsCount((v) => String(Math.max(0, Number(v) - 1)))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    −
                  </button>
                  <div className="flex h-10 w-20 items-center justify-center rounded-xl border-2 border-indigo-200 bg-indigo-50 text-xl font-bold text-indigo-700">
                    {dependentsCount}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDependentsCount((v) => String(Math.min(10, Number(v) + 1)))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    +
                  </button>
                  <span className="text-sm font-medium text-slate-600">
                    {Number(dependentsCount) === 0
                      ? 'Sem dependentes'
                      : Number(dependentsCount) === 1
                        ? '1 dependente'
                        : `${dependentsCount} dependentes`}
                  </span>
                </div>
              </Field>

              {/* Profession risk */}
              <Field
                label="Risco da Profissão"
                hint="Profissões de maior risco elevam o capital segurado recomendado."
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PROFESSION_RISKS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setProfessionRisk(opt.value)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        professionRisk === opt.value
                          ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className={`h-2 w-2 rounded-full ${opt.dot}`} />
                        <p className={`text-xs font-semibold ${professionRisk === opt.value ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {opt.label}
                        </p>
                      </div>
                      <p className="text-[10px] leading-snug text-slate-500">{opt.example}</p>
                    </button>
                  ))}
                </div>
              </Field>

              {/* Optional: coverage + debts */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Contexto Financeiro Adicional</p>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">opcional</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Cobertura de Seguro Atual"
                    hint="Capital segurado da apólice vigente. Motor calcula o gap em relação ao ideal."
                  >
                    <CurrencyInput value={currentCoverage} onChange={setCurrentCoverage} placeholder="200.000" />
                  </Field>
                  <Field
                    label="Total de Dívidas"
                    hint="Saldo devedor consolidado somado ao capital necessário."
                  >
                    <CurrencyInput value={debtTotal} onChange={setDebtTotal} placeholder="0" />
                  </Field>
                </div>
              </div>

              {/* Smoker toggle */}
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
                    O motor acrescenta percentual adicional ao capital recomendado para compensar o risco elevado de tabagismo.
                  </p>
                </div>
              </label>
            </div>

            {/* ── Consent ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Consentimento LGPD</h2>
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
                    Confirmo consentimento ativo do cliente para processamento deste diagnóstico (LGPD) *
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    O cliente autorizou expressamente o processamento de seus dados para fins de diagnóstico
                    de proteção de vida associado a este evento. Sem consentimento ativo o motor rejeita o registro.
                  </p>
                  {fieldErrors.consent && (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.consent}</p>
                  )}
                </div>
              </label>
            </div>

            {/* ── Error / Submit ── */}
            {submitError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${activeTrigger.bg}`}>
                  {(() => { const Icon = activeTrigger.icon; return <Icon className={`h-5 w-5 ${activeTrigger.color}`} /> })()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{activeTrigger.label}</p>
                  <p className="text-xs text-slate-400">Motor vai recalcular a proteção ideal</p>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {loading ? 'Calculando…' : 'Registrar e Calcular'}
                {!loading && <Send className="h-4 w-4" />}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components & constants ────────────────────────────────────

const PROFESSION_RISKS = [
  { value: 'BAIXO',      label: 'Baixo',      example: 'TI, escritório', dot: 'bg-emerald-500' },
  { value: 'MEDIO',      label: 'Médio',      example: 'Saúde, comércio', dot: 'bg-amber-500' },
  { value: 'ALTO',       label: 'Alto',       example: 'Construção, campo', dot: 'bg-orange-500' },
  { value: 'MUITO_ALTO', label: 'Muito Alto', example: 'Mineração, offshore', dot: 'bg-red-500' },
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
