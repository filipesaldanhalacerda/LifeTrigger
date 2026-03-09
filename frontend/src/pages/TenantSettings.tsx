import { useEffect, useState } from 'react'
import {
  Save, RotateCcw, AlertTriangle, TrendingUp,
  Wallet, ShieldCheck, CheckCircle2, Settings2,
  Landmark, Clock,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { getTenantSettings, putTenantSettings, getActiveTenantId } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import type { TenantSettings as TSettings } from '../types/api'

// ── Defaults ─────────────────────────────────────────────────────
const DEFAULTS: Omit<TSettings, 'tenantId'> = {
  incomeReplacementYearsSingle: 3,
  incomeReplacementYearsWithDependents: 5,
  emergencyFundBufferMonths: 6,
  maxTotalCoverageMultiplier: 20,
  minCoverageAnnualIncomeMultiplier: 3,
  inventoryRate: 0.08,
  maxIncomeReplacementYears: 10,
}

// ── Helpers ───────────────────────────────────────────────────────
function brl(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

// ── Component ─────────────────────────────────────────────────────
export default function TenantSettings() {
  const { user } = useAuth()

  const activeTenantId = user?.role === 'SuperAdmin'
    ? getActiveTenantId()
    : (user?.tenantId ?? null)

  const [settings, setSettings] = useState<TSettings>({
    tenantId: activeTenantId ?? '',
    ...DEFAULTS,
  })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!activeTenantId) { setLoading(false); return }
    setLoading(true)
    getTenantSettings(activeTenantId)
      .then((data) => setSettings({ ...data, tenantId: activeTenantId }))
      .catch(() => setSettings({ tenantId: activeTenantId, ...DEFAULTS }))
      .finally(() => setLoading(false))
  }, [activeTenantId])

  function set<K extends keyof TSettings>(key: K, value: TSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    if (!activeTenantId) return
    setSaving(true); setError(null)
    try {
      const updated = await putTenantSettings({ ...settings, tenantId: activeTenantId })
      setSettings({ ...updated, tenantId: activeTenantId })
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch {
      setError('Não foi possível salvar. Verifique se o backend está acessível.')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setSettings({ tenantId: activeTenantId ?? '', ...DEFAULTS })
    setSaved(false); setError(null)
  }

  // Count how many values differ from defaults
  const modifiedCount = (Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[])
    .filter((k) => settings[k] !== DEFAULTS[k]).length

  // ── Empty state ───────────────────────────────────────────────
  if (!activeTenantId) {
    return (
      <div>
        <TopBar title="Configurações" subtitle="Parâmetros do motor de cálculo" />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">Nenhuma corretora selecionada</p>
            <p className="mt-1 text-xs text-slate-400">Selecione uma corretora na barra superior para editar as configurações.</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Settings2 className="h-4 w-4 animate-spin" />
          Carregando configurações…
        </div>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────
  return (
    <div>
      <TopBar
        title="Configurações"
        subtitle="Parâmetros do motor de cálculo para este tenant"
      />

      <div className="p-3 sm:p-4 lg:p-5 animate-fadeIn">
        <div className="mx-auto max-w-2xl space-y-4 sm:space-y-5">

          {/* ── Header context banner ── */}
          <div className="flex items-start gap-3 rounded-sm border border-brand-100 bg-gradient-to-r from-brand-50 to-white p-4 sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-brand-600 shadow-sm">
              <Settings2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-900">Como estas configurações funcionam</p>
              <p className="mt-1 text-xs leading-relaxed text-brand-700">
                Cada parâmetro aqui é injetado diretamente no motor determinístico antes do cálculo.
                Eles definem <strong>os limites e multiplicadores</strong> usados nas fórmulas de reposição de renda,
                reserva de emergência e guardrails de cobertura. Alterações entram em vigor
                imediatamente em todas as novas avaliações desta corretora.
              </p>
            </div>
          </div>

          {/* ── Saved success banner ── */}
          {saved && (
            <div className="flex items-center gap-2.5 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="font-medium">Configurações salvas com sucesso.</span>
              <span className="text-emerald-600">Todas as novas avaliações já usam os novos parâmetros.</span>
            </div>
          )}

          {/* ── Section 1: Income Replacement ── */}
          <SettingsCard
            icon={TrendingUp}
            iconColor="text-brand-600"
            iconBg="bg-brand-50"
            title="Reposição de Renda"
            description="Define por quantos anos a família precisaria da renda do segurado em caso de sinistro. É o principal multiplicador do capital recomendado."
          >
            <SliderField
              label="Anos de reposição — cliente sem dependentes"
              value={settings.incomeReplacementYearsSingle}
              min={1} max={10} step={1}
              defaultValue={DEFAULTS.incomeReplacementYearsSingle}
              unit="anos"
              onChange={(v) => set('incomeReplacementYearsSingle', v)}
              formula="Capital base = Renda Anual × N anos"
              effectLines={[
                'Aplicado a clientes solteiros e sem dependentes declarados.',
                'Valor menor (1–2) → perfil de risco moderado para solteiros.',
                'Valor maior (5–10) → perfil conservador; recomendação de cobertura mais alta.',
              ]}
              example={`Ex: Renda R$10.000/mês → R$120.000/ano × ${settings.incomeReplacementYearsSingle} = ${brl(settings.incomeReplacementYearsSingle * 120000)} de capital base`}
            />

            <SliderField
              label="Anos base de reposição — cliente com dependentes"
              value={settings.incomeReplacementYearsWithDependents}
              min={2} max={15} step={1}
              defaultValue={DEFAULTS.incomeReplacementYearsWithDependents}
              unit="anos"
              onChange={(v) => set('incomeReplacementYearsWithDependents', v)}
              formula="Capital base = Renda Anual × (N + extra automático por dependentes)"
              effectLines={[
                'O motor acrescenta automaticamente até +3 anos extras conforme o nº de dependentes (1 dep. → +1 ano; 2 dep. → +2; 3 ou mais → +3).',
                'Este parâmetro é o valor BASE antes dos acréscimos automáticos.',
                'Aumentar reflete maior conservadorismo para famílias com filhos.',
              ]}
              example={`Ex: R$120.000/ano × ${settings.incomeReplacementYearsWithDependents} anos base + 2 dependentes (+2 anos) = ${brl((settings.incomeReplacementYearsWithDependents + 2) * 120000)}`}
            />
          </SettingsCard>

          {/* ── Section 2: Emergency Fund ── */}
          <SettingsCard
            icon={Wallet}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
            title="Reserva de Emergência"
            description="Define a meta de meses de reserva líquida. Se o cliente declarar menos meses do que a meta, o déficit é somado ao capital necessário de proteção."
          >
            <SliderField
              label="Meta de meses de reserva de emergência"
              value={settings.emergencyFundBufferMonths}
              min={3} max={9} step={1}
              defaultValue={DEFAULTS.emergencyFundBufferMonths}
              unit="meses"
              onChange={(v) => set('emergencyFundBufferMonths', v)}
              formula="Déficit de reserva = max(0, meta − meses declarados) × Renda Mensal"
              effectLines={[
                'Se o cliente tiver exatamente a meta ou mais, nenhum valor extra é somado ao capital.',
                'Se o cliente tiver menos, a diferença em reais é adicionada ao capital necessário.',
                'Meta maior → mais clientes terão déficit detectado → diagnósticos mais conservadores.',
              ]}
              example={`Ex: Meta ${settings.emergencyFundBufferMonths} meses. Cliente com 3 meses → déficit ${settings.emergencyFundBufferMonths - 3} meses × R$10.000 = ${brl(Math.max(0, settings.emergencyFundBufferMonths - 3) * 10000)} extras no capital`}
            />
          </SettingsCard>

          {/* ── Section 3: Guardrails ── */}
          <SettingsCard
            icon={ShieldCheck}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            title="Guardrails de Cobertura"
            description="Limites mínimo e máximo que o motor aplica ao capital recomendado, independente do resultado do cálculo. Evitam recomendações irreais por excesso ou insuficiência."
          >
            <SliderField
              label="Multiplicador do teto máximo de cobertura"
              value={settings.maxTotalCoverageMultiplier}
              min={5} max={50} step={1}
              defaultValue={DEFAULTS.maxTotalCoverageMultiplier}
              unit="× renda anual"
              onChange={(v) => set('maxTotalCoverageMultiplier', v)}
              formula="Teto = Renda Anual × multiplicador máximo"
              effectLines={[
                'O capital recomendado nunca ultrapassa este teto, mesmo que a fórmula resulte em valor maior.',
                'Protege contra recomendações irreais para clientes com muitos dependentes ou dívidas altas.',
                'Aumentar amplia o range de cobertura; reduzir limita clientes de alto risco.',
              ]}
              example={`Ex: R$120.000/ano × ${settings.maxTotalCoverageMultiplier}× = teto de ${brl(settings.maxTotalCoverageMultiplier * 120000)}`}
            />

            <SliderField
              label="Multiplicador do piso mínimo de cobertura"
              value={settings.minCoverageAnnualIncomeMultiplier}
              min={1} max={10} step={0.5}
              defaultValue={DEFAULTS.minCoverageAnnualIncomeMultiplier}
              unit="× renda anual"
              onChange={(v) => set('minCoverageAnnualIncomeMultiplier', v)}
              formula="Piso = Renda Anual × multiplicador mínimo"
              effectLines={[
                'Mesmo que o cliente já tenha cobertura suficiente, o motor garante este piso como recomendação mínima.',
                'Evita que clientes de baixo risco recebam diagnóstico com capital recomendado irrisório.',
                'O piso deve ser sempre menor que o teto máximo configurado acima.',
              ]}
              example={`Ex: R$120.000/ano × ${settings.minCoverageAnnualIncomeMultiplier}× = piso de ${brl(settings.minCoverageAnnualIncomeMultiplier * 120000)}`}
            />
          </SettingsCard>

          {/* ── Section 4: Succession / Inventory ── */}
          <SettingsCard
            icon={Landmark}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
            title="Sucessão e Inventário"
            description="Percentual estimado de custos advocatícios, cartorários e processuais para abertura de inventário. Aplicado sobre o valor total do patrimônio declarado."
          >
            <SliderField
              label="Taxa de inventário"
              value={settings.inventoryRate * 100}
              min={5} max={20} step={1}
              defaultValue={DEFAULTS.inventoryRate * 100}
              unit="%"
              onChange={(v) => set('inventoryRate', v / 100)}
              formula="Custo Inventário = Patrimônio Total × Taxa"
              effectLines={[
                'Inclui honorários advocatícios, custas judiciais e emolumentos cartorários.',
                'Taxa menor (5–8%) → inventários simples, patrimônio líquido e sem litígio.',
                'Taxa maior (12–20%) → patrimônio complexo, múltiplos imóveis ou disputas entre herdeiros.',
              ]}
              example={`Ex: Patrimônio R$1.000.000 × ${(settings.inventoryRate * 100).toFixed(0)}% = ${brl(settings.inventoryRate * 1000000)} somados ao capital recomendado`}
            />
          </SettingsCard>

          {/* ── Section 5: Max Income Replacement Years ── */}
          <SettingsCard
            icon={Clock}
            iconColor="text-sky-600"
            iconBg="bg-sky-50"
            title="Teto de Reposição de Renda"
            description="Limite absoluto de anos usado no cálculo de substituição de renda, independente da quantidade de dependentes ou do valor base configurado."
          >
            <SliderField
              label="Teto máximo de anos de reposição"
              value={settings.maxIncomeReplacementYears}
              min={5} max={20} step={1}
              defaultValue={DEFAULTS.maxIncomeReplacementYears}
              unit="anos"
              onChange={(v) => set('maxIncomeReplacementYears', v)}
              formula="Anos efetivos = min(base + extras por dependentes, teto)"
              effectLines={[
                'O motor soma anos-base + extras automáticos por dependente, mas nunca ultrapassa este teto.',
                'Teto menor (5–8) → perfil agressivo; limita exposição mesmo com muitos dependentes.',
                'Teto maior (12–20) → perfil conservador; permite recomendações mais altas para famílias grandes.',
                'Este valor deve ser maior ou igual aos anos-base configurados acima.',
              ]}
              example={`Ex: Base ${settings.incomeReplacementYearsWithDependents} anos + 3 dep. (+3) = ${settings.incomeReplacementYearsWithDependents + 3} → limitado ao teto de ${settings.maxIncomeReplacementYears} anos = ${Math.min(settings.incomeReplacementYearsWithDependents + 3, settings.maxIncomeReplacementYears)} anos efetivos`}
            />
          </SettingsCard>

          {/* ── Dynamic summary ── */}
          <div className="rounded-sm border border-slate-200 bg-white p-4 sm:p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Simulação ao Vivo</h2>
                <p className="mt-0.5 text-xs text-slate-400">Baseado em renda mensal de R$&nbsp;10.000 (R$&nbsp;120.000/ano)</p>
              </div>
              {modifiedCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  {modifiedCount} parâmetro{modifiedCount > 1 ? 's' : ''} modificado{modifiedCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SimRow
                label="Capital base — solteiro"
                formula={`R$120k × ${settings.incomeReplacementYearsSingle} anos`}
                value={brl(settings.incomeReplacementYearsSingle * 120000)}
                color="brand"
              />
              <SimRow
                label="Capital base — com 2 dep."
                formula={`R$120k × ${settings.incomeReplacementYearsWithDependents + 2} anos`}
                value={brl((settings.incomeReplacementYearsWithDependents + 2) * 120000)}
                color="brand"
              />
              <SimRow
                label="Piso garantido (guardrail)"
                formula={`R$120k × ${settings.minCoverageAnnualIncomeMultiplier}×`}
                value={brl(settings.minCoverageAnnualIncomeMultiplier * 120000)}
                color="emerald"
              />
              <SimRow
                label="Teto máximo (guardrail)"
                formula={`R$120k × ${settings.maxTotalCoverageMultiplier}×`}
                value={brl(settings.maxTotalCoverageMultiplier * 120000)}
                color="emerald"
              />
              <SimRow
                label="Adicional por reserva insuficiente"
                formula={`${Math.max(0, settings.emergencyFundBufferMonths - 3)} meses × R$10k`}
                value={brl(Math.max(0, settings.emergencyFundBufferMonths - 3) * 10000)}
                color="amber"
                note="(cliente com apenas 3 meses de reserva)"
              />
              <SimRow
                label="Custo de inventário"
                formula={`R$1M × ${(settings.inventoryRate * 100).toFixed(0)}%`}
                value={brl(settings.inventoryRate * 1000000)}
                color="amber"
                note="(patrimônio de R$ 1.000.000)"
              />
              <SimRow
                label="Teto reposição — com 3 dep."
                formula={`min(${settings.incomeReplacementYearsWithDependents}+3, ${settings.maxIncomeReplacementYears}) anos`}
                value={`${Math.min(settings.incomeReplacementYearsWithDependents + 3, settings.maxIncomeReplacementYears)} anos`}
                color="brand"
              />
            </div>

            {/* Guardrail consistency warning */}
            {settings.minCoverageAnnualIncomeMultiplier >= settings.maxTotalCoverageMultiplier && (
              <div className="mt-4 flex items-center gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>Atenção:</strong> O piso mínimo está maior ou igual ao teto máximo. O motor não conseguirá gerar diagnósticos válidos. Corrija antes de salvar.
                </span>
              </div>
            )}
          </div>

          {/* ── Save error ── */}
          {error && (
            <div className="flex items-center gap-2 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between rounded-sm border border-slate-200 bg-white px-4 sm:px-5 py-4 shadow-card">
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 rounded-sm border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors sm:py-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar padrões
            </button>
            <button
              onClick={handleSave}
              disabled={saving || settings.minCoverageAnnualIncomeMultiplier >= settings.maxTotalCoverageMultiplier}
              className="flex items-center justify-center gap-2 rounded-sm bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors sm:py-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Salvando…' : 'Salvar Configurações'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function SettingsCard({
  icon: Icon, iconColor, iconBg, title, description, children,
}: {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white shadow-card overflow-hidden">
      {/* Card header */}
      <div className="flex items-start gap-3 border-b border-slate-100 p-4 sm:p-5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${iconBg}`}>
          <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      {/* Fields */}
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-5">
        {children}
      </div>
    </div>
  )
}

function SliderField({
  label, value, min, max, step, defaultValue, unit,
  formula, effectLines, example, onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  defaultValue: number
  unit: string
  formula: string
  effectLines: string[]
  example: string
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  const isModified = value !== defaultValue

  return (
    <div className="space-y-3">
      {/* Label + value */}
      <div className="flex items-start justify-between gap-3">
        <label className="text-xs font-semibold leading-snug text-slate-700 flex-1">{label}</label>
        <div className="flex items-center gap-2 shrink-0">
          {isModified && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Modificado
            </span>
          )}
          <span className="rounded-sm bg-brand-50 px-2.5 py-1 text-sm font-bold text-brand-700 min-w-[72px] text-center tabular-nums">
            {value} {unit}
          </span>
        </div>
      </div>

      {/* Formula + effects box */}
      <div className="rounded-sm border border-slate-100 bg-slate-50 p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-brand-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-700">
            fórmula
          </span>
          <span className="font-mono text-[11px] text-slate-600">{formula}</span>
        </div>
        <ul className="space-y-1">
          {effectLines.map((line, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-500">
              <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
              {line}
            </li>
          ))}
        </ul>
        <p className="border-t border-slate-200 pt-2 text-[11px] font-medium text-slate-600 italic">{example}</p>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 appearance-none rounded-full cursor-pointer"
        style={{ background: `linear-gradient(to right, #4f46e5 ${pct}%, #e2e8f0 ${pct}%)` }}
      />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{min}</span>
        {isModified && (
          <span className="text-slate-400">
            padrão: {defaultValue} {unit}
          </span>
        )}
        <span>{max}</span>
      </div>
    </div>
  )
}

function SimRow({
  label, formula, value, color, note,
}: {
  label: string
  formula: string
  value: string
  color: 'brand' | 'emerald' | 'amber'
  span?: boolean
  note?: string
}) {
  const colors = {
    brand:   { bg: 'bg-brand-50',   text: 'text-brand-700',   label: 'text-brand-500'   },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'text-emerald-500' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'text-amber-500'   },
  }
  const c = colors[color]
  return (
    <div className={`rounded-sm ${c.bg} p-3`}>
      <p className={`text-[11px] font-medium ${c.label}`}>{label}</p>
      <p className={`mt-1 text-base font-bold tabular-nums ${c.text}`}>{value}</p>
      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{formula}</p>
      {note && <p className="mt-0.5 text-[10px] text-slate-400 italic">{note}</p>}
    </div>
  )
}
