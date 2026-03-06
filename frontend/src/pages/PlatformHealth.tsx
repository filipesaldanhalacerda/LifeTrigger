import { useEffect, useState } from 'react'
import {
  Activity, Database, Server, CheckCircle, XCircle,
  Loader2, HardDrive, Users, Shield,
  RefreshCw, Zap, AlertTriangle,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { getAuthDiagnostics, getEngineDiagnostics, fetchHealth } from '../lib/api'
import type { ServiceDiagnostics } from '../lib/api'

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

  return (
    <div>
      <TopBar
        title="Saúde da Plataforma"
        subtitle="Status dos serviços, banco de dados e infraestrutura"
      />

      <div className="p-4 sm:p-6 space-y-5 animate-fadeIn">

        {/* Overall status banner */}
        <div className={`rounded-2xl border p-4 sm:p-5 flex items-center gap-4 ${
          overallStatus === 'operational'
            ? 'border-emerald-200 bg-emerald-50'
            : overallStatus === 'degraded'
              ? 'border-amber-200 bg-amber-50'
              : 'border-red-200 bg-red-50'
        }`}>
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
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
            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
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

        {/* Database details side by side */}
        <div className="grid gap-4 lg:grid-cols-2">
          <DbCard
            title="Banco Auth"
            diagnostics={authDiag}
            tables={[
              { label: 'Usuários', key: 'users', icon: Users },
              { label: 'Tenants', key: 'tenants', icon: Server },
              { label: 'Eventos de Login', key: 'loginEvents', icon: Activity },
              { label: 'Refresh Tokens', key: 'refreshTokens', icon: Shield },
              { label: 'Sessões Ativas', key: 'activeSessions', icon: CheckCircle },
            ]}
          />
          <DbCard
            title="Banco Engine"
            diagnostics={engineDiag}
            tables={[
              { label: 'Avaliações', key: 'evaluations', icon: Activity },
              { label: 'Config. Tenant', key: 'tenantSettings', icon: Server },
              { label: 'Chaves Idempotência', key: 'idempotencyKeys', icon: Shield },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
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

function DbCard({
  title, diagnostics, tables,
}: {
  title: string
  diagnostics: ServiceDiagnostics | null
  tables: { label: string; key: string; icon: React.ElementType }[]
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 sm:px-5 py-4">
        <Database className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {diagnostics && (
          <span className="ml-auto text-xs text-slate-400">
            {diagnostics.database.sizeHuman ?? '—'}
          </span>
        )}
      </div>

      {diagnostics ? (
        <div className="divide-y divide-slate-100">
          {/* Capacity bar */}
          {diagnostics.database.activeConnections != null && diagnostics.database.maxConnections != null && (
            <div className="px-4 sm:px-5 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-slate-600">Conexões</p>
                <p className="text-xs tabular-nums text-slate-500">
                  {diagnostics.database.activeConnections} / {diagnostics.database.maxConnections}
                </p>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (diagnostics.database.activeConnections / diagnostics.database.maxConnections) > 0.8
                      ? 'bg-red-500'
                      : (diagnostics.database.activeConnections / diagnostics.database.maxConnections) > 0.5
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (diagnostics.database.activeConnections / diagnostics.database.maxConnections) * 100)}%`,
                    minWidth: '4px',
                  }}
                />
              </div>
            </div>
          )}

          {/* Table rows */}
          {tables.map(({ label, key, icon: TIcon }) => (
            <div key={key} className="flex items-center gap-3 px-4 sm:px-5 py-3">
              <TIcon className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-600 flex-1">{label}</span>
              <span className="text-sm font-bold tabular-nums text-slate-800">
                {diagnostics.tables[key]?.toLocaleString('pt-BR') ?? '—'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <HardDrive className="h-8 w-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Indisponível</p>
        </div>
      )}
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
