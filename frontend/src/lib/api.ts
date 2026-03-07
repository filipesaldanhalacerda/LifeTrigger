import type {
  LifeInsuranceAssessmentRequest,
  LifeInsuranceAssessmentResult,
  EvaluationRecord,
  EvaluationListResponse,
  TenantSettings,
  LifeTriggerEvent,
  PilotReport,
  AuditVerifyResult,
  EngineVersionInfo,
  Tenant,
  UserRecord,
  CreateUserPayload,
} from '../types/api'

// ── Config ───────────────────────────────────────────────────────
// Dev: Vite proxy handles routing to Auth API (5086) and Engine API (5001)
// Prod: Vercel rewrites proxy to the deployed API URLs
const AUTH_BASE   = import.meta.env.VITE_AUTH_API_URL   || '/api/v1'
const ENGINE_BASE = import.meta.env.VITE_ENGINE_API_URL || '/api/v1'

const TOKEN_KEY         = 'lt_access_token'
const REFRESH_TOKEN_KEY = 'lt_refresh_token'

// ── Token storage ────────────────────────────────────────────────
export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string): void {
  sessionStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function clearTokens(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getActiveTenantId(): string | null {
  return localStorage.getItem('lt_tenant_id')
}

export function setActiveTenantId(id: string): void {
  localStorage.setItem('lt_tenant_id', id)
}

// ── Auth API types ────────────────────────────────────────────────
export interface AuthUser {
  id: string
  email: string
  role: 'SuperAdmin' | 'TenantOwner' | 'Manager' | 'Broker' | 'Viewer'
  tenantId: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
}

// ── HTTP base ────────────────────────────────────────────────────
type ApiTarget = 'auth' | 'engine'

function baseFor(target: ApiTarget): string {
  return target === 'auth' ? AUTH_BASE : ENGINE_BASE
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  idempotencyKey?: string,
  _retry = true,
  target: ApiTarget = 'engine',
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    ...(options.headers as Record<string, string> | undefined),
  }
  const res = await fetch(`${baseFor(target)}${path}`, { ...options, headers })

  // ── Token expirado: tenta refresh automático (uma única vez) ──
  if (res.status === 401 && _retry) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      // Retry the original request with the fresh token
      return request<T>(path, options, idempotencyKey, false, target)
    }
    // Refresh also failed — session is gone
    clearTokens()
    window.location.replace('/login')
    throw new ApiError(401, 'Sessão expirada. Faça login novamente.')
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ApiError(res.status, body || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ── Auth API ─────────────────────────────────────────────────────

/** Login na Auth API — armazena access token + refresh token. */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${AUTH_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ApiError(res.status, body || 'Credenciais inválidas')
  }
  const data = await res.json() as LoginResponse
  setToken(data.accessToken)
  setRefreshToken(data.refreshToken)
  if (data.user.tenantId) setActiveTenantId(data.user.tenantId)
  return data
}

/** Renova o access token usando o refresh token armazenado (rotação automática). */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  try {
    const res = await fetch(`${AUTH_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) { clearTokens(); return null }
    const data = await res.json() as { accessToken: string; refreshToken: string }
    setToken(data.accessToken)
    setRefreshToken(data.refreshToken)
    return data.accessToken
  } catch {
    clearTokens()
    return null
  }
}

/** Encerra a sessão revogando o refresh token na Auth API. */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()
  const accessToken  = getToken()
  if (refreshToken && accessToken) {
    await fetch(`${AUTH_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => { /* best-effort */ })
  }
  clearTokens()
}

/** Retorna dados do usuário autenticado atual. */
export async function getMe(): Promise<AuthUser> {
  const res = await fetch(`${AUTH_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${getToken() ?? ''}` },
  })
  if (!res.ok) throw new ApiError(res.status, 'Não autenticado')
  return res.json() as Promise<AuthUser>
}

// ── Auth API — Tenants ────────────────────────────────────────────

/** Lista todos os tenants (SuperAdmin). */
export async function getTenants(): Promise<Tenant[]> {
  return request<Tenant[]>('/tenants', {}, undefined, true, 'auth')
}

/** Retorna um tenant pelo ID. */
export async function getTenant(id: string): Promise<Tenant> {
  return request<Tenant>(`/tenants/${id}`, {}, undefined, true, 'auth')
}

/** Cria um novo tenant (SuperAdmin). */
export async function createTenant(name: string, slug: string): Promise<Tenant> {
  return request<Tenant>('/tenants', {
    method: 'POST',
    body: JSON.stringify({ name, slug }),
  }, undefined, true, 'auth')
}

/** Ativa ou desativa um tenant (SuperAdmin). */
export async function updateTenantStatus(id: string, isActive: boolean): Promise<Tenant> {
  return request<Tenant>(`/tenants/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  }, undefined, true, 'auth')
}

// ── Engine ───────────────────────────────────────────────────────
export async function fetchEngineVersions(): Promise<EngineVersionInfo> {
  return request<EngineVersionInfo>('/engine/versions')
}

// ── Evaluations ──────────────────────────────────────────────────
export async function postEvaluation(
  req: LifeInsuranceAssessmentRequest,
  idempotencyKey: string,
): Promise<LifeInsuranceAssessmentResult> {
  return request<LifeInsuranceAssessmentResult>(
    '/evaluations',
    { method: 'POST', body: JSON.stringify(req) },
    idempotencyKey,
  )
}

export async function getEvaluations(
  tenantId: string | null,
  params?: { startDate?: string; endDate?: string; limit?: number; offset?: number },
): Promise<EvaluationListResponse> {
  const qs = new URLSearchParams()
  if (tenantId) qs.set('tenantId', tenantId)
  if (params?.startDate) qs.set('startDate', params.startDate)
  if (params?.endDate) qs.set('endDate', params.endDate)
  if (params?.limit != null) qs.set('limit', String(params.limit))
  if (params?.offset != null) qs.set('offset', String(params.offset))
  const query = qs.toString()
  return request<EvaluationListResponse>(`/evaluations${query ? `?${query}` : ''}`)
}

export async function getEvaluation(id: string): Promise<EvaluationRecord> {
  return request<EvaluationRecord>(`/evaluations/${id}`)
}

export async function updateEvaluationStatus(id: string, status: string): Promise<void> {
  return request<void>(`/evaluations/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function verifyEvaluationIntegrity(id: string): Promise<AuditVerifyResult> {
  return request<AuditVerifyResult>(`/admin/audit/evaluations/${id}/verify`)
}

export async function getPilotReport(
  tenantId: string,
  params?: { startDate?: string; endDate?: string; limit?: number; offset?: number },
): Promise<PilotReport> {
  const qs = new URLSearchParams({ tenantId })
  if (params?.startDate) qs.set('startDate', params.startDate)
  if (params?.endDate) qs.set('endDate', params.endDate)
  if (params?.limit != null) qs.set('limit', String(params.limit))
  if (params?.offset != null) qs.set('offset', String(params.offset))
  return request<PilotReport>(`/admin/reports/pilot?${qs}`)
}

export async function deleteDemoTenant(tenantId: string): Promise<void> {
  return request<void>(`/admin/demo-environments/tenants/${tenantId}`, {
    method: 'DELETE',
  })
}

// ── Triggers ─────────────────────────────────────────────────────
export async function postTrigger(
  event: LifeTriggerEvent,
  idempotencyKey: string,
): Promise<LifeInsuranceAssessmentResult> {
  return request<LifeInsuranceAssessmentResult>(
    '/triggers',
    { method: 'POST', body: JSON.stringify(event) },
    idempotencyKey,
  )
}

// ── Tenant Settings ──────────────────────────────────────────────
export async function getTenantSettings(tenantId: string): Promise<TenantSettings> {
  return request<TenantSettings>(`/admin/tenants/${tenantId}/settings`)
}

export async function putTenantSettings(settings: TenantSettings): Promise<TenantSettings> {
  return request<TenantSettings>(`/admin/tenants/${settings.tenantId}/settings`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}

// ── Team / Users ─────────────────────────────────────────────────
export async function getUsers(): Promise<UserRecord[]> {
  return request<UserRecord[]>('/users', {}, undefined, true, 'auth')
}

export async function createUser(payload: CreateUserPayload): Promise<UserRecord> {
  return request<UserRecord>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, undefined, true, 'auth')
}

export async function updateUserRole(id: string, role: string): Promise<UserRecord> {
  return request<UserRecord>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  }, undefined, true, 'auth')
}

export async function updateUserStatus(id: string, isActive: boolean): Promise<UserRecord> {
  return request<UserRecord>(`/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  }, undefined, true, 'auth')
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  return request<void>(`/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  }, undefined, true, 'auth')
}

// ── Login Events (Access Monitor) ────────────────────────────────
export interface LoginEventRecord {
  id: string
  userId: string
  email: string
  role: string
  tenantId: string | null
  success: boolean
  failReason: string | null
  ipAddress: string | null
  userAgent: string | null
  timestamp: string
}

export interface LoginEventsSummary {
  totalLogins: number
  successfulLogins: number
  failedLogins: number
  uniqueUsers: number
  uniqueIps: number
  activeSessions: number
  periodDays: number
}

export interface LoginEventsResponse {
  summary: LoginEventsSummary
  loginsPerDay: { date: string; count: number }[]
  topUsers: { email: string; role: string; count: number; lastLogin: string }[]
  events: LoginEventRecord[]
}

export async function getLoginEvents(startDate: string, endDate: string): Promise<LoginEventsResponse> {
  return request<LoginEventsResponse>(`/login-events?startDate=${startDate}&endDate=${endDate}&limit=500`, {}, undefined, true, 'auth')
}

// ── Health ───────────────────────────────────────────────────────
export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${ENGINE_BASE.replace('/api/v1', '')}/health`)
  if (!res.ok) return { status: 'Unhealthy' }
  const text = await res.text()
  return { status: text.trim() }
}

// ── Diagnostics ──────────────────────────────────────────────────
export interface ServiceDiagnostics {
  service: string
  status: string
  timestamp: string
  database: {
    connected: boolean
    error: string | null
    sizeBytes: number | null
    sizeHuman: string | null
    activeConnections: number | null
    maxConnections: number | null
  }
  tables: Record<string, number>
}

export async function getAuthDiagnostics(): Promise<ServiceDiagnostics> {
  return request<ServiceDiagnostics>('/diagnostics', {}, undefined, true, 'auth')
}

export async function getEngineDiagnostics(): Promise<ServiceDiagnostics> {
  return request<ServiceDiagnostics>('/engine-diagnostics', {}, undefined, true, 'engine')
}

// ── Evaluation Analytics ─────────────────────────────────────────
export interface EvaluationAnalytics {
  periodDays: number
  total: number
  avgScore: number
  avgGap: number
  perDay: { date: string; count: number }[]
  perTenant: { tenantId: string; count: number; lastEvaluation: string }[]
  perUser: { userId: string; count: number; lastEvaluation: string }[]
  riskDistribution: { risk: string; count: number }[]
  actionDistribution: { action: string; count: number }[]
}

export async function getEvaluationAnalytics(startDate: string, endDate: string): Promise<EvaluationAnalytics> {
  return request<EvaluationAnalytics>(`/analytics/evaluations?startDate=${startDate}&endDate=${endDate}`, {}, undefined, true, 'engine')
}
