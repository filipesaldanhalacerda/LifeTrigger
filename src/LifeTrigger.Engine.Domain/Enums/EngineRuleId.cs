namespace LifeTrigger.Engine.Domain.Enums;

/// <summary>
/// Identificadores fortemente tipados para todas as regras do Motor. 
/// Substitui strings estáticas para garantir que apenas regras catalogadas e validadas 
/// entrem no `EvaluationRecorder` e Snapshot de auditoria.
/// </summary>
public enum EngineRuleId
{
    // Income Replacement
    RULE_INCOME_REPLACEMENT_NO_DEPENDENTS,
    RULE_INCOME_REPLACEMENT_WITH_DEPENDENTS,
    
    // Sufficiency Defense
    RULE_INPUT_INSUFFICIENT_FOR_EVALUATION,

    // Debt
    RULE_DEBT_CLEARANCE_FULL,

    // Transition Reserve
    RULE_TRANSITION_RESERVE_WITH_FUND,
    RULE_TRANSITION_RESERVE_DEFAULT_NO_FUND,

    // Guardrails
    RULE_GUARDRAIL_MIN_COVERAGE,
    RULE_GUARDRAIL_MAX_COVERAGE,

    // Penalties
    RULE_PENALTY_LOW_COVERAGE_DEPENDENTS,
    RULE_PENALTY_HIGH_DEBT,
    RULE_PENALTY_NO_EMERGENCY_FUND,

    // Education Costs
    RULE_EDUCATION_COSTS,

    // Estate / Succession
    RULE_ITCMD_ESTATE_TAX,
    RULE_INVENTORY_COSTS,

    // Action Overrides
    RULE_ACTION_OVERRIDE_OLD_REVIEW,
    RULE_ACTION_OVERRIDE_UNCONFIRMED_DATA,
    RULE_ACTION_OVERRIDE_RECENT_TRIGGER
}
