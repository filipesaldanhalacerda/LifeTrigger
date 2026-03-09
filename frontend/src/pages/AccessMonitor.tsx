import { useEffect, useState } from 'react'
import {
  Activity, Users, Globe, Shield, AlertTriangle,
  CheckCircle, XCircle, Loader2, Monitor,
  Smartphone, Clock, MapPin,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { DateRangePicker } from '../components/ui/DateRangePicker'
import { getLoginEvents } from '../lib/api'
import type { LoginEventsResponse, LoginEventRecord } from '../lib/api'
import { today, daysAgo } from '../lib/dates'
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

interface IpGeo { city: string; region: string; country: string; isp: string }

async function fetchGeoForIps(ips: string[]): Promise<Map<string, IpGeo>> {
  const map = new Map<string, IpGeo>()
  const publicIps = [...new Set(ips)].filter(ip => ip && !ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('172.') && !ip.startsWith('::ffff:10.') && !ip.startsWith('127.'))
  if (publicIps.length === 0) return map
  try {
    const results = await Promise.allSettled(
      publicIps.slice(0, 30).map(async (ip) => {
        const res = await fetch(`https://free.freeipapi.com/api/json/${ip}`)
        if (!res.ok) return null
        const d = await res.json()
        return { ip, city: d.cityName as string, region: d.regionName as string, country: d.countryName as string, isp: (d.asnOrganization || d.asn || '') as string }
      })
    )
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        map.set(r.value.ip, { city: r.value.city, region: r.value.region, country: r.value.country, isp: r.value.isp })
      }
    }
  } catch { /* best-effort */ }
  return map
}

// ── Main ──────────────────────────────────────────────────────────
export default function AccessMonitor() {
  const [data, setData] = useState<LoginEventsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(daysAgo(7))
  const [endDate, setEndDate] = useState(today())
  const [geoMap, setGeoMap] = useState<Map<string, IpGeo>>(new Map())

  async function load(s: string, e: string) {
    setLoading(true)
    try {
      const res = await getLoginEvents(s, e)
      setData(res)
      // Fetch geolocation for unique IPs
      const ips = res.events.map(ev => ev.ipAddress).filter(Boolean) as string[]
      fetchGeoForIps(ips).then(setGeoMap).catch(() => {})
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

      <div className="p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4 animate-fadeIn">

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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
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
              <div className="rounded-sm border border-slate-200 bg-white shadow-card overflow-hidden">
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
            <div className="rounded-sm border border-slate-200 bg-white shadow-card overflow-hidden">
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
                      <EventCard key={ev.id} event={ev} geo={ev.ipAddress ? geoMap.get(ev.ipAddress) : undefined} />
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
                              <td className="px-4 py-3">
                                <span className="font-mono text-xs text-slate-500">{ev.ipAddress ?? '—'}</span>
                                {ev.ipAddress && geoMap.get(ev.ipAddress) && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3 text-rose-400 shrink-0" />
                                    <span className="text-[10px] text-slate-400 truncate">
                                      {geoMap.get(ev.ipAddress)!.city}, {geoMap.get(ev.ipAddress)!.region}
                                    </span>
                                  </div>
                                )}
                              </td>
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
  const total = data.reduce((s, d) => s + d.count, 0)
  const avg = data.length > 0 ? (total / data.length).toFixed(1) : '0'
  const labelEvery = Math.max(1, Math.ceil(data.length / 10))

  return (
    <div className="rounded-sm border border-slate-200 bg-white shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Logins por Dia</h2>
          <p className="mt-0.5 text-xs text-slate-400">{data.length} dias · média {avg}/dia · total {total}</p>
        </div>
        {hover !== null && (
          <div className="text-right animate-fadeIn">
            <p className="text-lg font-bold tabular-nums text-brand-700">{data[hover].count}</p>
            <p className="text-[11px] text-slate-400">{formatDateBR(data[hover].date)}</p>
          </div>
        )}
      </div>

      <div
        className="px-4 sm:px-5 pb-4 sm:pb-5"
        onMouseLeave={() => setHover(null)}
      >
        {/* Bar chart */}
        <div className="flex items-end justify-center gap-[3px] sm:gap-1.5" style={{ height: 180 }}>
          {data.map((d, i) => {
            const pct = max > 0 ? (d.count / max) * 100 : 0
            const isHovered = hover === i
            return (
              <div
                key={d.date}
                className="flex flex-col items-center justify-end h-full relative"
                onMouseEnter={() => setHover(i)}
                style={{ cursor: 'pointer', width: `${Math.min(100 / data.length, 12)}%`, maxWidth: 48 }}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] px-2 py-1 rounded-sm whitespace-nowrap z-10 shadow-lg pointer-events-none">
                    <span className="font-semibold">{d.count}</span> logins
                  </div>
                )}
                {/* Bar */}
                <div
                  className="w-full rounded-t transition-all duration-200"
                  style={{
                    height: `${Math.max(pct, 2)}%`,
                    minHeight: d.count > 0 ? 4 : 1,
                    background: isHovered
                      ? 'var(--color-brand-600)'
                      : 'var(--color-brand-400)',
                    opacity: hover !== null && !isHovered ? 0.45 : 1,
                  }}
                />
                {/* X label */}
                {i % labelEvery === 0 && (
                  <span className="text-[10px] text-slate-400 leading-none mt-1.5 whitespace-nowrap">
                    {formatDateBR(d.date)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
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
    <div className={`rounded-sm border bg-white p-3 sm:p-4 shadow-card ${
      highlight ? 'border-emerald-200 ring-1 ring-emerald-100' : warn ? 'border-red-200' : 'border-slate-200'
    }`}>
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${iconBg}`}>
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

function EventCard({ event: ev, geo }: { event: LoginEventRecord; geo?: IpGeo }) {
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
        {geo && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-rose-400" />
            {geo.city}, {geo.region}
          </span>
        )}
        <span>{timeAgo(ev.timestamp)}</span>
        {!ev.success && ev.failReason && (
          <span className="text-red-500 font-semibold">{ev.failReason}</span>
        )}
      </div>
    </div>
  )
}
