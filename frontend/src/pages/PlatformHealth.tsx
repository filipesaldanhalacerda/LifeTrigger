import { useEffect, useState } from 'react'
import {
  Activity, Database, Server, CheckCircle, XCircle,
  Loader2, HardDrive, Users, Shield,
  RefreshCw, Zap, AlertTriangle, Globe, ExternalLink, Cloud,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { getAuthDiagnostics, getEngineDiagnostics, fetchHealth } from '../lib/api'
import type { ServiceDiagnostics } from '../lib/api'

// ── Infrastructure config ─────────────────────────────────────────
const INFRA = {
  frontend: {
    name: 'Frontend',
    provider: 'Vercel',
    region: 'Edge (Global CDN)',
    dashboard: 'https://vercel.com',
  },
  authApi: {
    name: 'Auth API',
    provider: 'Render',
    region: 'Oregon (US West)',
    url: 'https://lifetrigger-auth.onrender.com',
    dashboard: 'https://dashboard.render.com',
  },
  engineApi: {
    name: 'Engine API',
    provider: 'Render',
    region: 'Oregon (US West)',
    url: 'https://lifetrigger-engine.onrender.com',
    dashboard: 'https://dashboard.render.com',
  },
  database: {
    name: 'PostgreSQL',
    provider: 'Render',
    region: 'Oregon (US West)',
    host: 'oregon-postgres.render.com',
    dbName: 'lifetrigger',
    dashboard: 'https://dashboard.render.com',
  },
}

export default function PlatformHealth() {
  const [authDiag, setAuthDiag] = useState<ServiceDiagnostics | null>(null)
  const [engineDiag, setEngineDiag] = useState<ServiceDiagnostics | null>(null)
  const [authHealth, setAuthHealth] = useState<'healthy' | 'degraded' | 'offline'>('offline')
  const [engineHealth, setEngineHealth] = useState<'healthy' | 'degraded' | 'offline'>('offline')
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  async function load() {
    setLoading(true)
    const results = await Promise.allSettled([
      getAuthDiagnostics(),
      getEngineDiagnostics(),
      fetchHealth(),
    ])

    if (results[0].status === 'fulfilled') {
      setAuthDiag(results[0].value)
      setAuthHealth(results[0].value.status === 'healthy' ? 'healthy' : 'degraded')
    } else {
      setAuthDiag(null)
      setAuthHealth('offline')
    }

    if (results[1].status === 'fulfilled') {
      setEngineDiag(results[1].value)
      setEngineHealth(results[1].value.status === 'healthy' ? 'healthy' : 'degraded')
    } else {
      setEngineDiag(null)
      setEngineHealth('offline')
    }

    if (results[2].status === 'fulfilled') {
      const h = results[2].value
      if (h.status !== 'healthy' && h.status !== 'Healthy') {
        setEngineHealth('degraded')
      }
    }

    setLastRefresh(new Date())
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => void load(), 30000)
    return () => clearInterval(interval)
  }, [])

  const overallStatus = authHealth === 'healthy' && engineHealth === 'healthy'
    ? 'operational'
    : authHealth === 'offline' || engineHealth === 'offline'
      ? 'partial_outage'
      : 'degraded'

  // Determine DB status from both diagnostics
  const dbConnected = (authDiag?.database.connected ?? false) || (engineDiag?.database.connected ?? false)
  const dbHealth: 'healthy' | 'degraded' | 'offline' =
    (authDiag?.database.connected && engineDiag?.database.connected) ? 'healthy'
      : dbConnected ? 'degraded' : 'offline'

  return (
    <div>
      <TopBar
        title="Saúde da Plataforma"
        subtitle="Status dos serviços, banco de dados e infraestrutura"
      />

      <div className="p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4 animate-fadeIn">

        {/* Overall status banner */}
        <div className={`rounded-sm border p-4 sm:p-5 flex items-center gap-4 ${
          overallStatus === 'operational'
            ? 'border-emerald-200 bg-emerald-50'
            : overallStatus === 'degraded'
              ? 'border-amber-200 bg-amber-50'
              : 'border-red-200 bg-red-50'
        }`}>
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm ${
            overallStatus === 'operational'
              ? 'bg-emerald-100'
              : overallStatus === 'degraded'
                ? 'bg-amber-100'
                : 'bg-red-100'
          }`}>
            {overallStatus === 'operational' ? (
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            ) : overallStatus === 'degraded' ? (
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`text-base font-bold ${
              overallStatus === 'operational' ? 'text-emerald-900'
                : overallStatus === 'degraded' ? 'text-amber-900'
                  : 'text-red-900'
            }`}>
              {overallStatus === 'operational' ? 'Todos os sistemas operacionais'
                : overallStatus === 'degraded' ? 'Desempenho degradado'
                  : 'Falha parcial detectada'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Atualizado em {lastRefresh.toLocaleTimeString('pt-BR')} · atualiza a cada 30s
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="shrink-0 flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {loading && !authDiag && !engineDiag && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            <span className="text-sm">Verificando serviços…</span>
          </div>
        )}

        {/* Infrastructure overview */}
        <div className="rounded-sm border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 sm:px-5 py-4">
            <Cloud className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">Infraestrutura de Produção</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <InfraRow
              icon={Globe}
              name={INFRA.frontend.name}
              provider={INFRA.frontend.provider}
              region={INFRA.frontend.region}
              status="healthy"
              dashboardUrl={INFRA.frontend.dashboard}
            />
            <InfraRow
              icon={Shield}
              name={INFRA.authApi.name}
              provider={INFRA.authApi.provider}
              region={INFRA.authApi.region}
              detail={INFRA.authApi.url}
              status={authHealth}
              dashboardUrl={INFRA.authApi.dashboard}
            />
            <InfraRow
              icon={Zap}
              name={INFRA.engineApi.name}
              provider={INFRA.engineApi.provider}
              region={INFRA.engineApi.region}
              detail={INFRA.engineApi.url}
              status={engineHealth}
              dashboardUrl={INFRA.engineApi.dashboard}
            />
            <InfraRow
              icon={Database}
              name={INFRA.database.name}
              provider={INFRA.database.provider}
              region={INFRA.database.region}
              detail={`${INFRA.database.dbName} @ ${INFRA.database.host}`}
              status={dbHealth}
              dashboardUrl={INFRA.database.dashboard}
            />
          </div>
        </div>

        {/* Service cards */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ServiceCard
            name="Auth API"
            description="Autenticação, usuários, tenants, tokens"
            status={authHealth}
            diagnostics={authDiag}
            icon={Shield}
          />
          <ServiceCard
            name="Engine API"
            description="Motor de avaliação, gatilhos, relatórios"
            status={engineHealth}
            diagnostics={engineDiag}
            icon={Zap}
          />
        </div>

        {/* Database details */}
        <div className="rounded-sm border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 sm:px-5 py-4">
            <Database className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">Banco de Dados — {INFRA.database.dbName}</h2>
            <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 font-medium">
              Render PostgreSQL
            </span>
            {(authDiag || engineDiag) && (
              <span className="ml-auto text-xs text-slate-400">
                {authDiag?.database.sizeHuman ?? engineDiag?.database.sizeHuman ?? '—'}
              </span>
            )}
          </div>

          {(authDiag || engineDiag) ? (
            <div>
              {/* Connection capacity bar */}
              {(() => {
                const active = authDiag?.database.activeConnections ?? engineDiag?.database.activeConnections
                const max = authDiag?.database.maxConnections ?? engineDiag?.database.maxConnections
                if (active == null || max == null) return null
                const pct = active / max
                return (
                  <div className="px-4 sm:px-5 py-3 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-slate-600">Conexões</p>
                      <p className="text-xs tabular-nums text-slate-500">{active} / {max}</p>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct > 0.8 ? 'bg-red-500' : pct > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, pct * 100)}%`, minWidth: '4px' }}
                      />
                    </div>
                  </div>
                )
              })()}

              {/* Two columns: Auth tables | Engine tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                <div>
                  <p className="px-4 sm:px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Tabelas Auth
                  </p>
                  <div className="divide-y divide-slate-50">
                    {[
                      { label: 'Usuários', key: 'users', icon: Users },
                      { label: 'Tenants', key: 'tenants', icon: Server },
                      { label: 'Eventos de Login', key: 'loginEvents', icon: Activity },
                      { label: 'Refresh Tokens', key: 'refreshTokens', icon: Shield },
                      { label: 'Sessões Ativas', key: 'activeSessions', icon: CheckCircle },
                    ].map(({ label, key, icon: TIcon }) => (
                      <div key={key} className="flex items-center gap-3 px-4 sm:px-5 py-2.5">
                        <TIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-600 flex-1">{label}</span>
                        <span className="text-sm font-bold tabular-nums text-slate-800">
                          {authDiag?.tables[key]?.toLocaleString('pt-BR') ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="px-4 sm:px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Tabelas Engine
                  </p>
                  <div className="divide-y divide-slate-50">
                    {[
                      { label: 'Avaliações', key: 'evaluations', icon: Activity },
                      { label: 'Config. Tenant', key: 'tenantSettings', icon: Server },
                      { label: 'Chaves Idempotência', key: 'idempotencyKeys', icon: Shield },
                    ].map(({ label, key, icon: TIcon }) => (
                      <div key={key} className="flex items-center gap-3 px-4 sm:px-5 py-2.5">
                        <TIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-600 flex-1">{label}</span>
                        <span className="text-sm font-bold tabular-nums text-slate-800">
                          {engineDiag?.tables[key]?.toLocaleString('pt-BR') ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <HardDrive className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Indisponível</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function InfraRow({
  icon: Icon, name, provider, region, detail, status, dashboardUrl,
}: {
  icon: React.ElementType
  name: string
  provider: string
  region: string
  detail?: string
  status: 'healthy' | 'degraded' | 'offline'
  dashboardUrl: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-5 py-3">
      <Icon className="h-4 w-4 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800">{name}</span>
          <StatusDot status={status} />
        </div>
        <p className="text-xs text-slate-400 truncate">
          {provider} · {region}
          {detail && <span className="hidden sm:inline"> · {detail}</span>}
        </p>
      </div>
      <a
        href={dashboardUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 flex items-center gap-1 rounded-sm px-2 py-1 text-[10px] font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
      >
        Dashboard
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}

function ServiceCard({
  name, description, status, diagnostics, icon: Icon,
}: {
  name: string
  description: string
  status: 'healthy' | 'degraded' | 'offline'
  diagnostics: ServiceDiagnostics | null
  icon: React.ElementType
}) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm ${
          status === 'healthy' ? 'bg-emerald-50' : status === 'degraded' ? 'bg-amber-50' : 'bg-red-50'
        }`}>
          <Icon className={`h-5 w-5 ${
            status === 'healthy' ? 'text-emerald-600' : status === 'degraded' ? 'text-amber-600' : 'text-red-500'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">{name}</h3>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>

      {diagnostics ? (
        <div className="grid grid-cols-2 gap-px bg-slate-100">
          <MetricCell label="Banco de Dados" value={diagnostics.database.connected ? 'Conectado' : 'Desconectado'} good={diagnostics.database.connected} />
          <MetricCell label="Tamanho do DB" value={diagnostics.database.sizeHuman ?? '—'} />
          <MetricCell label="Conexões Ativas" value={diagnostics.database.activeConnections?.toString() ?? '—'} />
          <MetricCell label="Conexões Máx." value={diagnostics.database.maxConnections?.toString() ?? '—'} />
        </div>
      ) : (
        <div className="p-6 text-center">
          {status === 'offline' ? (
            <p className="text-sm text-red-500 font-medium">Serviço indisponível</p>
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-slate-300 mx-auto" />
          )}
        </div>
      )}
    </div>
  )
}

function MetricCell({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[11px] text-slate-400 font-medium">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${
        good === true ? 'text-emerald-600' : good === false ? 'text-red-500' : 'text-slate-800'
      }`}>
        {value}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: 'healthy' | 'degraded' | 'offline' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
      status === 'healthy'
        ? 'bg-emerald-100 text-emerald-700'
        : status === 'degraded'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-red-100 text-red-700'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        status === 'healthy' ? 'bg-emerald-500 animate-pulse' : status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
      }`} />
      {status === 'healthy' ? 'Online' : status === 'degraded' ? 'Degradado' : 'Offline'}
    </span>
  )
}

function StatusDot({ status }: { status: 'healthy' | 'degraded' | 'offline' }) {
  return (
    <span className={`h-2 w-2 rounded-full shrink-0 ${
      status === 'healthy' ? 'bg-emerald-500 animate-pulse'
        : status === 'degraded' ? 'bg-amber-500'
          : 'bg-red-500'
    }`} />
  )
}
