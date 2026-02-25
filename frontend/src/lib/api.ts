import type {
  LifeInsuranceAssessmentRequest,
  LifeInsuranceAssessmentResult,
  EvaluationRecord,
  TenantSettings,
  LifeTriggerEvent,
  PilotReport,
  AuditVerifyResult,
  EngineVersionInfo,
} from '../types/api'

// ── Config ───────────────────────────────────────────────────────
const BASE_URL = '/api/v1'

// Demo JWT token for the Alpha tenant (development only)
const DEMO_TOKEN_KEY = 'lt_demo_token'
const DEMO_TENANT_ID = 'A1A1A1A1-A1A1-A1A1-A1A1-A1A1A1A1A1A1'

export function getToken(): string | null {
  return sessionStorage.getItem(DEMO_TOKEN_KEY)
}

export function setToken(token: string): void {
  sessionStorage.setItem(DEMO_TOKEN_KEY, token)
}

export function getActiveTenantId(): string {
  return localStorage.getItem('lt_tenant_id') ?? DEMO_TENANT_ID
}

export function setActiveTenantId(id: string): void {
  localStorage.setItem('lt_tenant_id', id)
}

// ── HTTP base ────────────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  idempotencyKey?: string,
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    ...(options.headers as Record<string, string> | undefined),
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
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

// ── Auth ─────────────────────────────────────────────────────────
export async function fetchDemoToken(tenantId: string = DEMO_TENANT_ID): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/mock-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId }),
  })
  if (!res.ok) throw new ApiError(res.status, 'Failed to get demo token')
  const data = await res.json() as { token: string }
  setToken(data.token)
  return data.token
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

export async function getEvaluation(id: string): Promise<EvaluationRecord> {
  return request<EvaluationRecord>(`/evaluations/${id}`)
}

export async function verifyEvaluationIntegrity(id: string): Promise<AuditVerifyResult> {
  return request<AuditVerifyResult>(`/evaluations/admin/audit/evaluations/${id}/verify`)
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
  return request<PilotReport>(`/evaluations/admin/reports/pilot?${qs}`)
}

export async function deleteDemoTenant(tenantId: string): Promise<void> {
  return request<void>(`/evaluations/admin/demo-environments/tenants/${tenantId}`, {
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

// ── Health ───────────────────────────────────────────────────────
export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch('/health')
  if (!res.ok) return { status: 'Unhealthy' }
  return res.json() as Promise<{ status: string }>
}

// ── Mock data (used when API is unavailable) ─────────────────────
export const DEMO_TENANTS = [
  { id: 'A1A1A1A1-A1A1-A1A1-A1A1-A1A1A1A1A1A1', name: 'DEMO_CORRETORA_ALPHA' },
  { id: 'B2B2B2B2-B2B2-B2B2-B2B2-B2B2B2B2B2B2', name: 'DEMO_EMPRESA_BETA' },
]
