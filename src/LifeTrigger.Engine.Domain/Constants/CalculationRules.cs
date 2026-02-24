namespace LifeTrigger.Engine.Domain.Constants;

public static class CalculationRules
{
    // Income Replacement (Substituição de Renda)
    public const int BaseIncomeReplacementYearsNoDependents = 2;
    public const int BaseIncomeReplacementYearsWithDependents = 5;
    public const int AdditionalYearsPerDependent = 1;
    public const int MaxAdditionalYearsForDependents = 3;
    public const int MaxTotalIncomeReplacementYears = 10;
    
    // Transition Reserve (Reserva de Transição)
    public const int DefaultTransitionReserveMonths = 6;
    public const int MinTransitionReserveBufferMonths = 3;
    public const int MaxTransitionReserveBufferMonths = 9;
    
    // Guardrails (Final Coverage caps)
    public const int MinCoverageAnnualIncomeMultiplier = 2;
    public const int MaxCoverageAnnualIncomeMultiplier = 20;

    // Debt Fallback
    public const int FallbackDebtTermMonths = 12;

    // Score Penalties
    public const int ScorePenaltyLowCoverageWithDependents = 10;
    public const int ScorePenaltyHighDebt = 10;
    public const int ScorePenaltyNoEmergencyFund = 10;
}
