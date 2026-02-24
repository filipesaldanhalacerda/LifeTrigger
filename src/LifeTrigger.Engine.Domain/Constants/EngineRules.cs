namespace LifeTrigger.Engine.Domain.Constants;

public static class EngineRules
{
    // Income Replacement
    public const string IncomeReplacementNoDependents = "RULE_INCOME_REPLACEMENT_NO_DEPENDENTS";
    public const string IncomeReplacementWithDependents = "RULE_INCOME_REPLACEMENT_WITH_DEPENDENTS";

    // Debt
    public const string DebtClearanceFull = "RULE_DEBT_CLEARANCE_FULL";

    // Transition Reserve
    public const string TransitionReserveWithFund = "RULE_TRANSITION_RESERVE_WITH_FUND";
    public const string TransitionReserveDefaultNoFund = "RULE_TRANSITION_RESERVE_DEFAULT_NO_FUND";

    // Guardrails
    public const string GuardrailMinCoverage = "RULE_GUARDRAIL_MIN_COVERAGE";
    public const string GuardrailMaxCoverage = "RULE_GUARDRAIL_MAX_COVERAGE";

    // Penalties
    public const string PenaltyLowCoverageDependents = "RULE_PENALTY_LOW_COVERAGE_DEPENDENTS";
    public const string PenaltyHighDebt = "RULE_PENALTY_HIGH_DEBT";
    public const string PenaltyNoEmergencyFund = "RULE_PENALTY_NO_EMERGENCY_FUND";

    // Action Overrides
    public const string ActionOverrideOldReview = "RULE_ACTION_OVERRIDE_OLD_REVIEW";
    public const string ActionOverrideUnconfirmedData = "RULE_ACTION_OVERRIDE_UNCONFIRMED_DATA";
    public const string ActionOverrideRecentTrigger = "RULE_ACTION_OVERRIDE_RECENT_TRIGGER";
}
