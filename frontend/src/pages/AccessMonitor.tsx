import { useEffect, useState } from 'react'
import {
  Activity, Users, Globe, Shield, AlertTriangle,
  CheckCircle, XCircle, Loader2, Monitor,
  Smartphone, Clock,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { getLoginEvents } from '../lib/api'
import type { LoginEventsResponse, LoginEventRecord } from '../lib/api'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function parseUA(ua: string | null): { browser: string; os: string; isMobile: boolean } {
  if (!ua) return { browser: 'Desconhecido', os: 'Desconhecido', isMobile: false }
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua)

  let browser = 'Outro'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Chrome\//i.test(ua)) browser = 'Chrome'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'

  let os = 'Outro'
  if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS/i.test(ua)) os = 'macOS'
  else if (/Linux/i.test(ua) && !isMobile) os = 'Linux'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS'

  return { browser, os, isMobile }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  return `${days}d atrás`
}

const ROLE_COLORS: Record<string, string> = {
  SuperAdmin: 'bg-red-100 text-red-700',
  TenantOwner: 'bg-purple-100 text-purple-700',
  Manager: 'bg-blue-100 text-blue-700',
  Broker: 'bg-emerald-100 text-emerald-700',
  Viewer: 'bg-slate-100 text-slate-600',
}

// ── Main ──────────────────────────────────────────────────────────
export default function AccessMonitor() {
  const [data, setData] = useState<LoginEventsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(daysAgo(7))
  const [endDate, setEndDate] = useState(today())

  async function load(s: string, e: string) {
    setLoading(true)
    try {
      const res = await getLoginEvents(s, e)
      setData(res)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(startDate, endDate) }, [startDate, endDate])

  const s = data?.summary

  return (
    <div>
      <TopBar
        title="Monitor de Acessos"
        subtitle={loading ? 'Carregando…' : `${s?.totalLogins ?? 0} logins no período selecionado`}
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 animate-fadeIn">

        {/* Period selector */}
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          maxDate={today()}
          onChange={(s, e) => { setStartDate(s); setEndDate(e) }}
        />

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            <span className="text-sm">Carregando dados de acesso…</span>
          </div>
        )}

        {!loading && data && (
          <>
            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <SummaryCard
                label="Sessões Ativas"
                value={s!.activeSessions}
                icon={Activity}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                highlight
              />
              <SummaryCard
                label="Logins"
                value={s!.successfulLogins}
                icon={CheckCircle}
                iconBg="bg-brand-50"
                iconColor="text-brand-600"
              />
              <SummaryCard
                label="Falhas"
                value={s!.failedLogins}
                icon={XCircle}
                iconBg="bg-red-50"
                iconColor="text-red-500"
                warn={s!.failedLogins > 0}
              />
              <SummaryCard
                label="Usuários Únicos"
                value={s!.uniqueUsers}
                icon={Users}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
              />
              <SummaryCard
                label="IPs Únicos"
                value={s!.uniqueIps}
                icon={Globe}
                iconBg="bg-sky-50"
                iconColor="text-sky-600"
              />
              <SummaryCard
                label="Período"
                value={`${s!.periodDays} dia${s!.periodDays !== 1 ? 's' : ''}`}
                icon={Clock}
                iconBg="bg-slate-100"
                iconColor="text-slate-500"
              />
            </div>

            {/* ── Logins per day chart ── */}
            {data.loginsPerDay.length > 0 && (
              <LoginChart data={data.loginsPerDay} />
            )}

            {/* ── Top users ── */}
            {data.topUsers.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 sm:px-5 py-4">
                  <Users className="h-4 w-4 text-slate-400" />
                  <h2 className="text-sm font-bold text-slate-900">Usuários Mais Ativos</h2>
                </div>

                {/* Mobile cards */}
                <div className="divide-y divide-slate-100 sm:hidden">
                  {data.topUsers.map((u) => (
                    <div key={u.email} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800 truncate">{u.email}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                          {u.role}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{u.count} login{u.count > 1 ? 's' : ''}</span>
                        <span>{timeAgo(u.lastLogin)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Usuário</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Perfil</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Logins</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Último Acesso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topUsers.map((u) => (
                        <tr key={u.email} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold tabular-nums text-slate-800">{u.count}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(u.lastLogin)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Recent events ── */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 sm:px-5 py-4">
                <Shield className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-900">Log de Acessos Recentes</h2>
                <span className="ml-auto text-xs text-slate-400">{data.events.length} registros</span>
              </div>

              {data.events.length === 0 ? (
                <div className="py-16 text-center">
                  <Activity className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                  <p className="text-sm font-semibold text-slate-700">Nenhum login registrado</p>
                  <p className="mt-1 text-xs text-slate-400">Os logins começarão a aparecer aqui após o deploy com o tracking ativado.</p>
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="divide-y divide-slate-100 sm:hidden">
                    {data.events.slice(0, 50).map((ev) => (
                      <EventCard key={ev.id} event={ev} />
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Usuário</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Perfil</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">IP</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Navegador</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Quando</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.events.slice(0, 100).map((ev) => {
                          const ua = parseUA(ev.userAgent)
                          return (
                            <tr key={ev.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3">
                                {ev.success ? (
                                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    OK
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                                    <XCircle className="h-3.5 w-3.5" />
                                    Falha
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-800">{ev.email}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[ev.role] ?? 'bg-slate-100 text-slate-600'}`}>
                                  {ev.role}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-500">{ev.ipAddress ?? '—'}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  {ua.isMobile ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                                  {ua.browser} · {ua.os}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{timeAgo(ev.timestamp)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* No data */}
        {!loading && !data && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <AlertTriangle className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Erro ao carregar dados de acesso</p>
            <p className="text-xs text-slate-400">Verifique se o backend auth-api está acessível.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function formatDateBR(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function LoginChart({ data }: { data: { date: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)

  const max = Math.max(...data.map((d) => d.count), 1)
  const step = max <= 5 ? 1 : max <= 20 ? 5 : max <= 50 ? 10 : max <= 200 ? 25 : 50
  const ceil = Math.ceil(max / step) * step || 1
  const gridCount = 4
  const gridLines = Array.from({ length: gridCount }, (_, i) => Math.round((ceil / gridCount) * (gridCount - i)))

  const W = 500
  const H = 160
  const ML = 30 // margin left for Y labels
  const MR = 8
  const MT = 8
  const MB = 20 // margin bottom for X labels

  const chartW = W - ML - MR
  const chartH = H - MT - MB
  const n = data.length

  const points = data.map((d, i) => ({
    x: ML + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2),
    y: MT + chartH - (d.count / ceil) * chartH,
    ...d,
  }))

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${points[points.length - 1].x},${MT + chartH} L${points[0].x},${MT + chartH} Z`

  const labelEvery = Math.max(1, Math.ceil(n / 8))
  const total = data.reduce((s, d) => s + d.count, 0)
  const avg = n > 0 ? (total / n).toFixed(1) : '0'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-1">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Logins por Dia</h2>
          <p className="mt-0.5 text-xs text-slate-400">{data.length} dias · média {avg}/dia</p>
        </div>
        {hover !== null && (
          <div className="text-right animate-fadeIn">
            <p className="text-lg font-bold tabular-nums text-brand-700">{points[hover].count}</p>
            <p className="text-[11px] text-slate-400">{formatDateBR(points[hover].date)}</p>
          </div>
        )}
      </div>

      <div className="px-2 sm:px-3 pb-3" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
          {/* Grid lines + Y labels */}
          {gridLines.map((v) => {
            const y = MT + chartH - (v / ceil) * chartH
            return (
              <g key={v}>
                <line x1={ML} y1={y} x2={W - MR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={ML - 6} y={y + 3.5} fontSize="9" fill="#94a3b8" textAnchor="end" fontFamily="system-ui">{v}</text>
              </g>
            )
          })}
          <line x1={ML} y1={MT + chartH} x2={W - MR} y2={MT + chartH} stroke="#e2e8f0" strokeWidth="1" />
          <text x={ML - 6} y={MT + chartH + 3.5} fontSize="9" fill="#94a3b8" textAnchor="end" fontFamily="system-ui">0</text>

          {/* Area gradient */}
          <defs>
            <linearGradient id="loginArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#loginArea)" />
          <path d={line} fill="none" stroke="var(--color-brand-500)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* Data points + hover */}
          {points.map((p, i) => (
            <g key={p.date}>
              <rect
                x={p.x - chartW / n / 2}
                y={0}
                width={chartW / n}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                style={{ cursor: 'pointer' }}
              />
              {hover === i && (
                <line x1={p.x} y1={MT} x2={p.x} y2={MT + chartH} stroke="var(--color-brand-300)" strokeWidth="1" strokeDasharray="4,3" />
              )}
              <circle
                cx={p.x} cy={p.y}
                r={hover === i ? 5 : 2.5}
                fill={hover === i ? 'var(--color-brand-600)' : 'var(--color-brand-500)'}
                stroke="white" strokeWidth={hover === i ? 2 : 0}
              />
              {i % labelEvery === 0 && (
                <text x={p.x} y={H - 4} fontSize="9" fill="#94a3b8" textAnchor="middle" fontFamily="system-ui">
                  {formatDateBR(p.date)}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

function SummaryCard({
  label, value, icon: Icon, iconBg, iconColor, highlight, warn,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  highlight?: boolean
  warn?: boolean
}) {
  return (
    <div className={`rounded-2xl border bg-white p-3 sm:p-4 shadow-card ${
      highlight ? 'border-emerald-200 ring-1 ring-emerald-100' : warn ? 'border-red-200' : 'border-slate-200'
    }`}>
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 truncate">{label}</p>
          <p className={`text-lg font-bold tabular-nums ${warn ? 'text-red-600' : 'text-slate-900'}`}>
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </p>
        </div>
      </div>
    </div>
  )
}

function EventCard({ event: ev }: { event: LoginEventRecord }) {
  const ua = parseUA(ev.userAgent)
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {ev.success ? (
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-red-500" />
          )}
          <p className="text-sm font-semibold text-slate-800 truncate">{ev.email}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[ev.role] ?? 'bg-slate-100 text-slate-600'}`}>
          {ev.role}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          {ua.isMobile ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
          {ua.browser} · {ua.os}
        </span>
        {ev.ipAddress && (
          <span className="font-mono">{ev.ipAddress}</span>
        )}
        <span>{timeAgo(ev.timestamp)}</span>
        {!ev.success && ev.failReason && (
          <span className="text-red-500 font-semibold">{ev.failReason}</span>
        )}
      </div>
    </div>
  )
}
