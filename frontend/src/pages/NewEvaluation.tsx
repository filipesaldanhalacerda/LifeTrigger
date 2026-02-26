import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Send, AlertCircle } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { postEvaluation, getActiveTenantId } from '../lib/api'
import { generateIdempotencyKey } from '../lib/utils'
import type { LifeInsuranceAssessmentRequest } from '../types/api'

const STEPS = ['Pessoal', 'Financeiro', 'Família', 'Operacional']

export default function NewEvaluation() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [age, setAge] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [professionRisk, setProfessionRisk] = useState('BAIXO')
  const [isSmoker, setIsSmoker] = useState(false)

  const [income, setIncome] = useState('')
  const [currentCoverage, setCurrentCoverage] = useState('')
  const [policyType, setPolicyType] = useState('')
  const [debtTotal, setDebtTotal] = useState('')
  const [debtMonths, setDebtMonths] = useState('')
  const [emergencyFund, setEmergencyFund] = useState('')

  const [dependentsCount, setDependentsCount] = useState('0')
  const [dependentsAges, setDependentsAges] = useState('')

  const [channel, setChannel] = useState('Web')
  const [consent, setConsent] = useState(false)
  const [consentId, setConsentId] = useState(`consent-${Date.now()}`)
  const [hasUnconfirmed, setHasUnconfirmed] = useState(false)
  const [lastReviewMonthsAgo, setLastReviewMonthsAgo] = useState('')

  async function handleSubmit() {
    if (!consent) { setError('Consentimento ativo é obrigatório (LGPD).'); return }
    setLoading(true)
    setError(null)
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
          monthlyIncome: { exactValue: Number(income) },
          currentLifeInsurance: currentCoverage ? {
            coverageAmount: Number(currentCoverage),
            policyType: policyType as never || undefined,
          } : undefined,
          debts: debtTotal ? {
            totalAmount: Number(debtTotal),
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

      const key = generateIdempotencyKey()
      const result = await postEvaluation(req, key)
      // Store result and navigate
      sessionStorage.setItem('lt_last_result', JSON.stringify(result))
      navigate('/evaluations/result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar avaliação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <TopBar title="Nova Avaliação" subtitle="Diagnóstico de necessidade de proteção" />

      <div className="p-6">
        {/* Stepper */}
        <div className="mb-8 flex items-center gap-0">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold
                    ${i < step ? 'bg-indigo-600 text-white' : i === step ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-100 text-slate-400'}`}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-sm font-medium ${i === step ? 'text-indigo-700' : i < step ? 'text-slate-700' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-3 h-px w-12 ${i < step ? 'bg-indigo-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            {/* Step 0 – Personal */}
            {step === 0 && (
              <div className="space-y-5">
                <SectionTitle>Contexto Pessoal</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Idade *">
                    <input type="number" min="18" max="99" value={age} onChange={(e) => setAge(e.target.value)} placeholder="35" className={inputCls} />
                  </Field>
                  <Field label="Estado Civil">
                    <select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className={inputCls}>
                      <option value="">Não informado</option>
                      <option value="SOLTEIRO">Solteiro(a)</option>
                      <option value="CASADO">Casado(a)</option>
                      <option value="DIVORCIADO">Divorciado(a)</option>
                      <option value="VIUVO">Viúvo(a)</option>
                    </select>
                  </Field>
                </div>
                <Field label="Nível de Risco da Profissão *">
                  <select value={professionRisk} onChange={(e) => setProfessionRisk(e.target.value)} className={inputCls}>
                    <option value="BAIXO">Baixo (escritório, administrativo)</option>
                    <option value="MEDIO">Médio (comércio, saúde)</option>
                    <option value="ALTO">Alto (construção, logística)</option>
                    <option value="MUITO_ALTO">Muito Alto (mineração, segurança)</option>
                  </select>
                </Field>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" checked={isSmoker} onChange={(e) => setIsSmoker(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                  <span className="text-sm text-slate-700">Fumante</span>
                </label>
              </div>
            )}

            {/* Step 1 – Financial */}
            {step === 1 && (
              <div className="space-y-5">
                <SectionTitle>Contexto Financeiro</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Renda Mensal Bruta (R$) *">
                    <input type="number" min="0" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="10000" className={inputCls} />
                  </Field>
                  <Field label="Meses de Reserva de Emergência">
                    <input type="number" min="0" max="24" value={emergencyFund} onChange={(e) => setEmergencyFund(e.target.value)} placeholder="3" className={inputCls} />
                  </Field>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seguro de Vida Atual</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Capital Segurado Atual (R$)">
                      <input type="number" min="0" value={currentCoverage} onChange={(e) => setCurrentCoverage(e.target.value)} placeholder="200000" className={inputCls} />
                    </Field>
                    <Field label="Tipo de Apólice">
                      <select value={policyType} onChange={(e) => setPolicyType(e.target.value)} className={inputCls}>
                        <option value="">Não informado</option>
                        <option value="TEMPORARIO">Temporário</option>
                        <option value="VIDA_INTEIRA">Vida Inteira</option>
                        <option value="ACIDENTES_PESSOAIS">Acidentes Pessoais</option>
                        <option value="DESCONHECIDO">Desconhecido</option>
                      </select>
                    </Field>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dívidas Ativas</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Total de Dívidas (R$)">
                      <input type="number" min="0" value={debtTotal} onChange={(e) => setDebtTotal(e.target.value)} placeholder="150000" className={inputCls} />
                    </Field>
                    <Field label="Prazo Restante (meses)">
                      <input type="number" min="0" value={debtMonths} onChange={(e) => setDebtMonths(e.target.value)} placeholder="120" className={inputCls} />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 – Family */}
            {step === 2 && (
              <div className="space-y-5">
                <SectionTitle>Contexto Familiar</SectionTitle>
                <Field label="Número de Dependentes *">
                  <input type="number" min="0" max="10" value={dependentsCount} onChange={(e) => setDependentsCount(e.target.value)} className={inputCls} />
                </Field>
                {Number(dependentsCount) > 0 && (
                  <Field label="Idades dos Dependentes (separadas por vírgula)">
                    <input type="text" value={dependentsAges} onChange={(e) => setDependentsAges(e.target.value)} placeholder="5, 8, 12" className={inputCls} />
                  </Field>
                )}
              </div>
            )}

            {/* Step 3 – Operational */}
            {step === 3 && (
              <div className="space-y-5">
                <SectionTitle>Dados Operacionais</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Canal de Origem *">
                    <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputCls}>
                      <option value="Web">Web</option>
                      <option value="Mobile">Mobile</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="API">API</option>
                      <option value="Presencial">Presencial</option>
                    </select>
                  </Field>
                  <Field label="Última revisão foi há (meses)">
                    <input type="number" min="0" value={lastReviewMonthsAgo} onChange={(e) => setLastReviewMonthsAgo(e.target.value)} placeholder="0 = nunca" className={inputCls} />
                  </Field>
                </div>
                <Field label="ID de Consentimento (LGPD) *">
                  <input type="text" value={consentId} onChange={(e) => setConsentId(e.target.value)} className={inputCls} />
                </Field>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                  <span className="text-sm text-slate-700">
                    Confirmo consentimento ativo do cliente (LGPD) *
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" checked={hasUnconfirmed} onChange={(e) => setHasUnconfirmed(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                  <span className="text-sm text-slate-700">Dados ainda não confirmados pelo cliente</span>
                </label>
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
                className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-0 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={step === 0 && !age}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !consent}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Calculando…' : 'Gerar Diagnóstico'}
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-slate-900">{children}</h2>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}
