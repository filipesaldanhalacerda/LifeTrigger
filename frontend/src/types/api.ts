export type UserRole = 'SuperAdmin' | 'TenantOwner' | 'Manager' | 'Broker' | 'Viewer'

export interface UserRecord {
  id: string
  email: string
  role: UserRole
  tenantId: string | null
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

export interface CreateUserPayload {
  email: string
  password: string
  role: UserRole
  tenantId: string | null
}

export type MaritalStatus = 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO'
export type ProfessionRiskLevel = 'BAIXO' | 'MEDIO' | 'ALTO' | 'MUITO_ALTO'
export type PolicyType = 'TEMPORARIO' | 'VIDA_INTEIRA' | 'ACIDENTES_PESSOAIS' | 'DESCONHECIDO'
export type RiskClassification = 'CRITICO' | 'MODERADO' | 'ADEQUADO'
export type RecommendedAction = 'AUMENTAR' | 'MANTER' | 'REDUZIR' | 'REVISAR'
export type CoverageStatus = 'SUBPROTEGIDO' | 'ADEQUADO' | 'SOBRESEGURADO'

export interface IncomeData {
  exactValue?: number
  bracket?: string
}

export interface DebtData {
  totalAmount: number
  remainingTermMonths?: number
}

export interface CurrentInsuranceData {
  coverageAmount: number
  policyType?: PolicyType
}

export interface PersonalContext {
  age: number
  maritalStatus?: MaritalStatus
  professionRiskLevel: ProfessionRiskLevel
  isSmoker?: boolean
}

export interface EducationData {
  totalEstimatedCost: number
}

export interface EstateData {
  totalEstateValue: number
  state?: string
}

export interface FinancialContext {
  monthlyIncome: IncomeData
  currentLifeInsurance?: CurrentInsuranceData
  debts?: DebtData
  emergencyFundMonths?: number
  educationCosts?: EducationData
  estate?: EstateData
}

export interface FamilyContext {
  dependentsCount: number
  dependentsAges?: number[]
}

export interface OperationalData {
  originChannel: string
  hasExplicitActiveConsent: boolean
  consentId: string
  hasUnconfirmedData?: boolean
  recentLifeTrigger?: boolean
  lastReviewDate?: string
  tenantId?: string
}

export interface LifeInsuranceAssessmentRequest {
  personalContext: PersonalContext
  financialContext: FinancialContext
  familyContext: FamilyContext
  operationalData: OperationalData
}

export interface RuleJustification {
  ruleId: string
  templateId: string
  messageKey: string
  args: Record<string, unknown>
  renderedText?: string
}

export interface AuditMetadata {
  engineVersion: string
  ruleSetVersion: string
  ruleSetHash: string
  appliedRules: string[]
  timestamp: string
  consentId: string
}

export type InsightCategory =
  | 'ABERTURA'
  | 'ARGUMENTO_PRINCIPAL'
  | 'OBJECAO_PREVISTA'
  | 'PRODUTO_SUGERIDO'
  | 'PROXIMO_PASSO'

export type InsightPriority = 'ALTA' | 'MEDIA' | 'BAIXA'

export interface BrokerInsight {
  category: InsightCategory
  priority: InsightPriority
  headline: string
  body: string
}

export interface LifeInsuranceAssessmentResult {
  recommendedCoverageAmount: number
  currentCoverageAmount: number
  protectionGapAmount: number
  protectionGapPercentage: number
  protectionScore: number
  coverageEfficiencyScore: number
  incomeReplacementAmount: number
  debtClearanceAmount: number
  transitionReserveAmount: number
  educationCostsAmount: number
  itcmdCostAmount: number
  inventoryCostAmount: number
  riskClassification: RiskClassification
  coverageStatus: CoverageStatus
  recommendedAction: RecommendedAction
  regrasAplicadas: string[]
  justificationsStructured: RuleJustification[]
  justificationsRendered: string[]
  brokerInsights: BrokerInsight[]
  audit: AuditMetadata
}

export interface EvaluationRecord {
  id: string
  timestamp: string
  engineVersion: string
  ruleSetVersion: string
  request: LifeInsuranceAssessmentRequest
  result: LifeInsuranceAssessmentResult
  auditHash?: string
}

export interface TenantSettings {
  tenantId: string
  incomeReplacementYearsSingle: number
  incomeReplacementYearsWithDependents: number
  emergencyFundBufferMonths: number
  maxTotalCoverageMultiplier: number
  minCoverageAnnualIncomeMultiplier: number
}

export interface LifeTriggerEvent {
  triggerType: string
  description: string
  eventDate: string
  baseRequest: LifeInsuranceAssessmentRequest
}

export interface PilotReport {
  totalEvaluations: number
  riskDistribution: { critico: number; moderado: number; adequado: number }
  actionDistribution: { aumentar: number; manter: number; reduzir: number; revisar: number }
  triggerCount: number
}

export interface AuditVerifyResult {
  id: string
  status: 'PASS' | 'FAIL' | 'UNAVAILABLE'
  message?: string
  storedHash?: string
  computedHash?: string
}

export interface EngineVersionInfo {
  engineVersion: string
  ruleSetVersion: string
  description: string
}

export interface EvaluationSummary {
  id: string
  timestamp: string
  action: RecommendedAction
  risk: RiskClassification
  score: number
  gapPct: number
  channel: string
  createdByUserId?: string
  consentId?: string
}

export interface EvaluationListResponse {
  total: number
  items: EvaluationSummary[]
}

export interface Tenant {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: string
}
