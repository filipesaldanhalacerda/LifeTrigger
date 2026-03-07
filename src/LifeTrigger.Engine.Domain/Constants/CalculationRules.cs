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

    // Estate / Succession Defaults
    public const decimal DefaultItcmdRate = 0.04m;       // 4% — média nacional
    public const decimal DefaultInventoryRate = 0.10m;    // 10% — custos advocatícios e processuais

    // ITCMD rates by state (Brazilian states)
    public static decimal GetItcmdRateByState(string? state) => (state?.ToUpperInvariant()) switch
    {
        "AC" => 0.04m, "AL" => 0.04m, "AM" => 0.04m, "AP" => 0.04m,
        "BA" => 0.08m, "CE" => 0.08m, "DF" => 0.06m, "ES" => 0.04m,
        "GO" => 0.08m, "MA" => 0.07m, "MG" => 0.05m, "MS" => 0.06m,
        "MT" => 0.08m, "PA" => 0.06m, "PB" => 0.08m, "PE" => 0.08m,
        "PI" => 0.06m, "PR" => 0.04m, "RJ" => 0.08m, "RN" => 0.06m,
        "RO" => 0.04m, "RR" => 0.04m, "RS" => 0.06m, "SC" => 0.08m,
        "SE" => 0.08m, "SP" => 0.04m, "TO" => 0.08m,
        _ => DefaultItcmdRate,
    };

    // Score Penalties
    public const int ScorePenaltyLowCoverageWithDependents = 10;
    public const int ScorePenaltyHighDebt = 10;
    public const int ScorePenaltyNoEmergencyFund = 10;
}
