import { useEffect, useState } from 'react'
import {
  CreditCard, Activity, Users, Zap,
  CheckCircle, AlertTriangle, Loader2,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { getPilotReport, getUsers, getActiveTenantId } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import type { PilotReport, UserRecord } from '../types/api'

// ── Plan limits (hardcoded for now — would come from backend in production) ──
const PLAN = {
  name: 'Profissional',
  maxEvaluationsPerMonth: 500,
  maxUsers: 10,
  price: 'R$ 497/mês',
  features: [
    'Motor de avaliação de proteção de vida',
    'Gatilhos de vida inteligentes',
    'Relatórios gerenciais completos',
    'Auditoria criptográfica de avaliações',
    'Insights do motor por corretor',
    'Suporte prioritário',
  ],
}

// ── Usage bar ─────────────────────────────────────────────────────
function UsageBar({
  label, used, max, icon: Icon, iconBg, iconColor, warnAt = 0.8,
}: {
  label: string
  used: number
  max: number
  icon: React.ElementType
  iconBg: string
  iconColor: string
  warnAt?: number
}) {
  const pct       = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  const isWarning = pct >= warnAt * 100
  const isCritical = pct >= 95

  const barColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-brand-500'

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-4 sm:p-5 shadow-card">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-sm ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="text-[11px] text-slate-400">limite mensal</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-slate-900 tabular-nums">{used.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-slate-400">de {max.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-2.5 rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold tabular-nums ${isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-500'}`}>
            {pct}% utilizado
          </span>
          {isCritical && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
              <AlertTriangle className="h-3 w-3" />
              Limite crítico
            </span>
          )}
          {isWarning && !isCritical && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              Atenção
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function Billing() {
  const { user } = useAuth()
  const [report,  setReport]  = useState<PilotReport | null>(null)
  const [users,   setUsers]   = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const tenantId = getActiveTenantId()
    if (!tenantId) { setLoading(false); return }
    try {
      const [reportRes, usersRes] = await Promise.allSettled([
        getPilotReport(tenantId, { limit: 500 }),
        getUsers(),
      ])
      if (reportRes.status === 'fulfilled') setReport(reportRes.value)
      if (usersRes.status === 'fulfilled')  setUsers(usersRes.value)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const activeUsers       = users.filter((u) => u.isActive).length
  const totalEvaluations  = report?.totalEvaluations ?? 0

  return (
    <div>
      <TopBar
        title="Plano & Faturamento"
        subtitle="Consumo e informações do plano ativo"
      />

      <div className="p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4 animate-fadeIn">

        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            <span className="text-sm">Carregando dados de faturamento…</span>
          </div>
        )}

        {!loading && (
          <>
            {/* ── Plan card ── */}
            <div className="rounded-sm border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4 sm:p-6 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-5 w-5 text-brand-600" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">Plano Atual</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{PLAN.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{PLAN.price}</p>
                  {user && (
                    <p className="mt-2 text-xs text-slate-400">
                      Conta: <span className="font-semibold text-slate-600">{user.email}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">Ativo</span>
                </div>
              </div>

              {/* Features */}
              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PLAN.features.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                    <span className="text-xs text-slate-600">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Usage ── */}
            <div>
              <h3 className="mb-3 text-sm font-bold text-slate-900">Consumo do Mês</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                <UsageBar
                  label="Avaliações"
                  used={totalEvaluations}
                  max={PLAN.maxEvaluationsPerMonth}
                  icon={Activity}
                  iconBg="bg-brand-50"
                  iconColor="text-brand-600"
                />
                <UsageBar
                  label="Usuários Ativos"
                  used={activeUsers}
                  max={PLAN.maxUsers}
                  icon={Users}
                  iconBg="bg-violet-50"
                  iconColor="text-violet-600"
                />
                <UsageBar
                  label="Gatilhos de Vida"
                  used={report?.triggerCount ?? 0}
                  max={PLAN.maxEvaluationsPerMonth}
                  icon={Zap}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                />
              </div>
            </div>

            {/* ── Info card ── */}
            <div className="rounded-sm border border-slate-200 bg-white p-4 sm:p-5 shadow-card">
              <h3 className="mb-3 text-sm font-bold text-slate-900">Informações de Cobrança</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-sm text-slate-600">Plano</span>
                  <span className="text-sm font-semibold text-slate-800">{PLAN.name}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-sm text-slate-600">Valor mensal</span>
                  <span className="text-sm font-semibold text-slate-800">{PLAN.price}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-sm text-slate-600">Método de pagamento</span>
                  <span className="text-sm text-slate-500">Entre em contato com o suporte</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Suporte</span>
                  <a href="mailto:alltasksolucoesintegradas@gmail.com" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                    alltasksolucoesintegradas@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* ── Upgrade banner ── */}
            {(totalEvaluations / PLAN.maxEvaluationsPerMonth > 0.7 || activeUsers / PLAN.maxUsers > 0.7) && (
              <div className="flex items-start gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Você está se aproximando do limite do plano</p>
                  <p className="mt-0.5 text-xs text-amber-700">
                    Entre em contato com nossa equipe comercial para fazer upgrade e garantir continuidade do serviço.
                  </p>
                  <a
                    href="mailto:alltasksolucoesintegradas@gmail.com"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 underline"
                  >
                    Falar com comercial →
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
