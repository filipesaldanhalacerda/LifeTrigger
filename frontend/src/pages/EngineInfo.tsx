import { useEffect, useState } from 'react'
import { Cpu, Activity, Shield, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { fetchEngineVersions, fetchHealth } from '../lib/api'
import type { EngineVersionInfo } from '../types/api'

export default function EngineInfo() {
  const [info, setInfo] = useState<EngineVersionInfo | null>(null)
  const [health, setHealth] = useState<'loading' | 'healthy' | 'unhealthy'>('loading')
  async function load() {
    try {
      const [ver, h] = await Promise.all([fetchEngineVersions(), fetchHealth()])
      setInfo(ver)
      setHealth(h.status === 'Healthy' ? 'healthy' : 'unhealthy')
    } catch {
      setHealth('unhealthy')
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <div>
      <TopBar title="Motor & Sistema" subtitle="Versão do motor e status operacional" />

      <div className="p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4 animate-fadeIn">
        {/* Health status */}
        <div className={`flex items-center gap-3 rounded-sm border p-4 shadow-card ${
          health === 'healthy' ? 'border-emerald-200 bg-emerald-50' :
          health === 'unhealthy' ? 'border-red-200 bg-red-50' :
          'border-slate-200 bg-slate-50'
        }`}>
          {health === 'healthy' ? (
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          ) : health === 'unhealthy' ? (
            <AlertCircle className="h-6 w-6 text-red-600" />
          ) : (
            <Activity className="h-6 w-6 animate-pulse text-slate-400" />
          )}
          <div>
            <p className={`font-semibold ${health === 'healthy' ? 'text-emerald-800' : health === 'unhealthy' ? 'text-red-800' : 'text-slate-700'}`}>
              {health === 'loading' ? 'Verificando…' : health === 'healthy' ? 'Sistema Operacional' : 'API Indisponível'}
            </p>
            <p className="text-xs text-slate-500">
              {health === 'healthy' ? 'Todos os serviços respondem normalmente.' :
               health === 'unhealthy' ? 'Backend não acessível em localhost:5001.' :
               'Aguardando resposta do backend…'}
            </p>
          </div>
        </div>

        {/* Version cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            icon={Cpu}
            iconColor="text-brand-600"
            iconBg="bg-brand-50"
            label="Versão do Motor"
            value={info?.engineVersion ?? '—'}
            sub="LifeTrigger Engine"
          />
          <InfoCard
            icon={Shield}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
            label="Versão do Ruleset"
            value={info?.ruleSetVersion ?? '—'}
            sub="Conjunto de regras ativo"
          />
          <InfoCard
            icon={Zap}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
            label="Status"
            value={health === 'healthy' ? 'Healthy' : health === 'unhealthy' ? 'Unhealthy' : '…'}
            sub="Endpoint /health"
          />
        </div>

        {/* Description */}
        {info?.description && (
          <div className="rounded-sm border border-slate-200 bg-white p-4 sm:p-5 shadow-card">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Descrição do Motor</h2>
            <p className="text-sm text-slate-600">{info.description}</p>
          </div>
        )}

        {/* Architecture summary */}
        <div className="rounded-sm border border-slate-200 bg-white p-4 sm:p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Arquitetura</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: 'Núcleo Determinístico', desc: 'Zero I/O — mesmo input sempre produz o mesmo output. Sem heurística ou IA.' },
              { label: 'Multi-tenant', desc: 'Isolamento por tenant_id via JWT. Nenhuma avaliação vaza entre corretoras.' },
              { label: 'Idempotência', desc: 'Header Idempotency-Key previne duplicidades em retries e cliques duplos.' },
              { label: 'LGPD Nativa', desc: 'Sem PII na API. Consentimento ativo obrigatório. AuditHash imutável.' },
              { label: 'Rate Limiting', desc: '60 req/min por IP (fixed window). Proteção contra abuso e scraping.' },
              { label: 'Correlation ID', desc: 'Cada request recebe X-Correlation-ID propagado nos logs estruturados.' },
            ].map((item) => (
              <div key={item.label} className="rounded-sm border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-800">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Endpoints reference */}
        <div className="rounded-sm border border-slate-200 bg-white p-4 sm:p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Endpoints Disponíveis</h2>
          <div className="space-y-1">
            {[
              ['POST', '/api/v1/evaluations', 'Avaliação principal'],
              ['GET',  '/api/v1/evaluations/{id}', 'Recuperar avaliação'],
              ['POST', '/api/v1/triggers', 'Registrar evento de vida'],
              ['GET',  '/api/v1/evaluations/admin/audit/evaluations/{id}/verify', 'Verificar integridade'],
              ['GET',  '/api/v1/evaluations/admin/reports/pilot', 'Relatório agregado'],
              ['GET',  '/api/v1/admin/tenants/{id}/settings', 'Configurações do tenant'],
              ['PUT',  '/api/v1/admin/tenants/{id}/settings', 'Atualizar configurações'],
              ['GET',  '/api/v1/engine/versions', 'Versão do motor'],
              ['GET',  '/health', 'Health check'],
            ].map(([method, path, desc]) => (
              <div key={path} className="flex items-center gap-3 rounded-sm py-2 px-1 hover:bg-slate-50">
                <span className={`w-12 shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-[11px] font-bold ${
                  method === 'POST' ? 'bg-emerald-100 text-emerald-700' :
                  method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                  method === 'DELETE' ? 'bg-red-100 text-red-700' :
                  'bg-sky-100 text-sky-700'
                }`}>
                  {method}
                </span>
                <span className="flex-1 font-mono text-xs text-slate-600">{path}</span>
                <span className="text-xs text-slate-400 hidden sm:block">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  icon: Icon, iconColor, iconBg, label, value, sub,
}: {
  icon: React.ElementType; iconColor: string; iconBg: string; label: string; value: string; sub: string
}) {
  return (
    <div className="flex items-start gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-5 shadow-card">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{value}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  )
}
