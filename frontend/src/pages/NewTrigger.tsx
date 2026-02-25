import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Zap, AlertCircle } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { postTrigger, getActiveTenantId, fetchDemoToken, getToken } from '../lib/api'
import { generateIdempotencyKey } from '../lib/utils'
import type { LifeTriggerEvent } from '../types/api'

const TRIGGER_TYPES = [
  { value: 'Casamento', label: 'Casamento', desc: 'União matrimonial ou civil' },
  { value: 'NovoFilho', label: 'Novo Filho', desc: 'Nascimento ou adoção' },
  { value: 'Imovel', label: 'Aquisição de Imóvel', desc: 'Compra ou financiamento' },
  { value: 'Aumento_Salario', label: 'Aumento de Salário', desc: 'Promoção ou novo emprego' },
  { value: 'Divorcio', label: 'Divórcio / Separação', desc: 'Mudança no estado civil' },
  { value: 'Aposentadoria', label: 'Aposentadoria', desc: 'Transição de carreira' },
  { value: 'Personalizado', label: 'Evento Personalizado', desc: 'Outro evento de vida relevante' },
]

export default function NewTrigger() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Trigger fields
  const [triggerType, setTriggerType] = useState('Casamento')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10))

  // Base request (simplified)
  const [age, setAge] = useState('')
  const [income, setIncome] = useState('')
  const [dependentsCount, setDependentsCount] = useState('0')
  const [currentCoverage, setCurrentCoverage] = useState('')
  const [debtTotal, setDebtTotal] = useState('')
  const [professionRisk, setProfessionRisk] = useState('BAIXO')
  const [consentId] = useState(`consent-trigger-${Date.now()}`)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!age || !income) { setError('Idade e renda são obrigatórios.'); return }
    setLoading(true)
    setError(null)
    try {
      if (!getToken()) await fetchDemoToken(getActiveTenantId())
      const event: LifeTriggerEvent = {
        triggerType,
        description: description || (TRIGGER_TYPES.find((t) => t.value === triggerType)?.label ?? triggerType),
        eventDate: new Date(eventDate).toISOString(),
        baseRequest: {
          personalContext: { age: Number(age), professionRiskLevel: professionRisk as never },
          financialContext: {
            monthlyIncome: { exactValue: Number(income) },
            currentLifeInsurance: currentCoverage ? { coverageAmount: Number(currentCoverage) } : undefined,
            debts: debtTotal ? { totalAmount: Number(debtTotal) } : undefined,
          },
          familyContext: { dependentsCount: Number(dependentsCount) },
          operationalData: {
            originChannel: 'Web',
            hasExplicitActiveConsent: true,
            consentId,
            tenantId: getActiveTenantId(),
          },
        },
      }
      const result = await postTrigger(event, generateIdempotencyKey())
      sessionStorage.setItem('lt_last_result', JSON.stringify(result))
      navigate('/evaluations/result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao registrar gatilho.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <TopBar title="Registrar Gatilho de Vida" subtitle="Evento que altera a necessidade de proteção" />

      <div className="p-6">
        <div className="mx-auto max-w-2xl">
          {/* Trigger type selector */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Tipo de Evento</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TRIGGER_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTriggerType(t.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    triggerType === t.value
                      ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className={`h-3.5 w-3.5 ${triggerType === t.value ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className={`text-xs font-semibold ${triggerType === t.value ? 'text-indigo-700' : 'text-slate-700'}`}>
                      {t.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Event details */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Detalhes do Evento</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Data do Evento *">
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputCls} required />
                </Field>
                <Field label="Descrição (opcional)">
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Compra de apartamento" className={inputCls} />
                </Field>
              </div>
            </div>

            {/* Base request */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Dados do Cliente</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Idade *">
                  <input type="number" min="18" max="99" value={age} onChange={(e) => setAge(e.target.value)} placeholder="35" className={inputCls} required />
                </Field>
                <Field label="Renda Mensal (R$) *">
                  <input type="number" min="0" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="10000" className={inputCls} required />
                </Field>
                <Field label="Nº Dependentes">
                  <input type="number" min="0" value={dependentsCount} onChange={(e) => setDependentsCount(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Risco da Profissão">
                  <select value={professionRisk} onChange={(e) => setProfessionRisk(e.target.value)} className={inputCls}>
                    <option value="BAIXO">Baixo</option>
                    <option value="MEDIO">Médio</option>
                    <option value="ALTO">Alto</option>
                    <option value="MUITO_ALTO">Muito Alto</option>
                  </select>
                </Field>
                <Field label="Cobertura Atual (R$)">
                  <input type="number" min="0" value={currentCoverage} onChange={(e) => setCurrentCoverage(e.target.value)} placeholder="200000" className={inputCls} />
                </Field>
                <Field label="Total de Dívidas (R$)">
                  <input type="number" min="0" value={debtTotal} onChange={(e) => setDebtTotal(e.target.value)} placeholder="0" className={inputCls} />
                </Field>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Processando…' : 'Registrar e Calcular'}
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}
