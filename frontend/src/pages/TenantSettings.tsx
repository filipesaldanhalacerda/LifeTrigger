import { useEffect, useState } from 'react'
import { Save, RotateCcw, Info } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { getTenantSettings, putTenantSettings, getActiveTenantId } from '../lib/api'
import type { TenantSettings as TSettings } from '../types/api'

const DEFAULTS: Omit<TSettings, 'tenantId'> = {
  incomeReplacementYearsSingle: 2,
  incomeReplacementYearsWithDependents: 5,
  emergencyFundBufferMonths: 6,
  maxTotalCoverageMultiplier: 20,
  minCoverageAnnualIncomeMultiplier: 2,
}

export default function TenantSettings() {
  const [settings, setSettings] = useState<TSettings>({
    tenantId: getActiveTenantId() ?? '',
    ...DEFAULTS,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getTenantSettings(getActiveTenantId() ?? '')
      .then(setSettings)
      .catch(() => {/* use defaults */})
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof TSettings>(key: K, value: TSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await putTenantSettings(settings)
      setSettings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('Erro ao salvar configurações. Verifique se o backend está acessível.')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setSettings({ tenantId: getActiveTenantId() ?? '', ...DEFAULTS })
    setSaved(false)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-500">Carregando configurações…</p>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="Configurações do Tenant" subtitle={`Tenant: ${settings.tenantId.slice(0, 8)}…`} />

      <div className="p-6">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Info banner */}
          <div className="flex items-start gap-2.5 rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Estes parâmetros calibram o motor de cálculo para este tenant. Alterações afetam
              todas as novas avaliações imediatamente.
            </p>
          </div>

          {/* Reposição de renda */}
          <SettingsCard title="Reposição de Renda">
            <SliderField
              label="Anos para cliente sem dependentes"
              value={settings.incomeReplacementYearsSingle}
              min={1} max={10} step={1}
              default={DEFAULTS.incomeReplacementYearsSingle}
              unit="anos"
              onChange={(v) => set('incomeReplacementYearsSingle', v)}
              hint="Padrão: 2 anos. Aumentar torna o motor mais conservador para solteiros."
            />
            <SliderField
              label="Anos base para cliente com dependentes"
              value={settings.incomeReplacementYearsWithDependents}
              min={2} max={15} step={1}
              default={DEFAULTS.incomeReplacementYearsWithDependents}
              unit="anos"
              onChange={(v) => set('incomeReplacementYearsWithDependents', v)}
              hint="Padrão: 5 anos. O motor acrescenta até +3 anos extras por número de dependentes."
            />
          </SettingsCard>

          {/* Reserva de emergência */}
          <SettingsCard title="Reserva de Emergência">
            <SliderField
              label="Meses alvo de reserva de emergência"
              value={settings.emergencyFundBufferMonths}
              min={3} max={9} step={1}
              default={DEFAULTS.emergencyFundBufferMonths}
              unit="meses"
              onChange={(v) => set('emergencyFundBufferMonths', v)}
              hint="Padrão: 6 meses. Clientes com fundo insuficiente têm a reserva adicional calculada."
            />
          </SettingsCard>

          {/* Guardrails */}
          <SettingsCard title="Guardrails de Cobertura">
            <SliderField
              label="Multiplicador máximo da cobertura"
              value={settings.maxTotalCoverageMultiplier}
              min={5} max={50} step={1}
              default={DEFAULTS.maxTotalCoverageMultiplier}
              unit="× renda anual"
              onChange={(v) => set('maxTotalCoverageMultiplier', v)}
              hint="Teto de cobertura = renda anual × multiplicador. Padrão: 20×."
            />
            <SliderField
              label="Multiplicador mínimo da cobertura"
              value={settings.minCoverageAnnualIncomeMultiplier}
              min={1} max={10} step={0.5}
              default={DEFAULTS.minCoverageAnnualIncomeMultiplier}
              unit="× renda anual"
              onChange={(v) => set('minCoverageAnnualIncomeMultiplier', v)}
              hint="Piso de cobertura = renda anual × multiplicador. Padrão: 2×."
            />
          </SettingsCard>

          {/* Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Resumo (renda mensal R$10.000 / renda anual R$120.000)</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <SumRow label="Cobertura mínima" value={`R$ ${(settings.minCoverageAnnualIncomeMultiplier * 120000).toLocaleString('pt-BR')}`} />
              <SumRow label="Cobertura máxima" value={`R$ ${(settings.maxTotalCoverageMultiplier * 120000).toLocaleString('pt-BR')}`} />
              <SumRow label="Rep. renda sem dep." value={`R$ ${(settings.incomeReplacementYearsSingle * 120000).toLocaleString('pt-BR')}`} />
              <SumRow label="Rep. renda com dep." value={`R$ ${(settings.incomeReplacementYearsWithDependents * 120000).toLocaleString('pt-BR')} (base)`} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar padrões
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Salvando…' : saved ? '✓ Salvo!' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  )
}

function SliderField({
  label, value, min, max, step, default: def, unit, hint, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number
  default: number; unit: string; hint: string; onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <div className="flex items-center gap-2">
          {value !== def && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
              Modificado
            </span>
          )}
          <span className="text-base font-bold text-indigo-700 min-w-[60px] text-right">
            {value} {unit}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 appearance-none rounded-full bg-slate-200 accent-indigo-600 cursor-pointer"
        style={{ background: `linear-gradient(to right, #4f46e5 ${pct}%, #e2e8f0 ${pct}%)` }}
      />
      <div className="flex justify-between text-[11px] text-slate-400">
        <span>{min}</span>
        <span className="text-slate-400 italic">{hint}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value}</p>
    </div>
  )
}
