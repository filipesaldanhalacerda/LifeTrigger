using LifeTrigger.Engine.Domain.Enums;

namespace LifeTrigger.Engine.Domain.Constants;

public static class CalculationRules
{
    // Income Replacement (Substituição de Renda)
    public const int BaseIncomeReplacementYearsNoDependents = 3;  // Mercado BR recomenda mínimo 3× para solteiros
    public const int BaseIncomeReplacementYearsWithDependents = 5;
    public const int AdditionalYearsPerDependent = 1;
    public const int MaxAdditionalYearsForDependents = 3;
    public const int MaxTotalIncomeReplacementYears = 10;

    // Transition Reserve (Reserva de Transição)
    public const int DefaultTransitionReserveMonths = 6;
    public const int MinTransitionReserveBufferMonths = 3;
    public const int MaxTransitionReserveBufferMonths = 9;

    // Guardrails (Final Coverage caps)
    public const int MinCoverageAnnualIncomeMultiplier = 3;   // SUSEP/seguradoras recomendam mínimo 3× renda anual
    public const int MaxCoverageAnnualIncomeMultiplier = 20;

    // Estate / Succession Defaults
    public const decimal DefaultItcmdRate = 0.04m;       // 4% — fallback quando UF desconhecida (mínimo nacional)
    public const decimal DefaultInventoryRate = 0.08m;    // 8% — média ponderada (extrajudicial ~5% + judicial ~12%)

    // ITCMD rates by state (Brazilian states)
    public static decimal GetItcmdRateByState(string? state) => (state?.ToUpperInvariant()) switch
    {
        "AC" => 0.04m, "AL" => 0.04m, "AM" => 0.04m, "AP" => 0.04m,
        "BA" => 0.08m, "CE" => 0.08m, "DF" => 0.06m, "ES" => 0.04m,
        "GO" => 0.08m, "MA" => 0.07m, "MG" => 0.05m, "MS" => 0.06m,
        "MT" => 0.08m, "PA" => 0.06m, "PB" => 0.08m, "PE" => 0.08m,
        "PI" => 0.06m, "PR" => 0.04m, "RJ" => 0.08m, "RN" => 0.06m,
        "RO" => 0.04m, "RR" => 0.04m, "RS" => 0.06m, "SC" => 0.08m,
        "SE" => 0.08m, "SP" => 0.08m, "TO" => 0.08m,
        _ => DefaultItcmdRate,
    };

    // Coverage Effective Factor by PolicyType
    // Determines what fraction of the declared coverage actually protects the family
    // against ALL causes of death (not just accidents).
    public static decimal GetCoverageEffectiveFactor(PolicyType? policyType) => policyType switch
    {
        PolicyType.TEMPORARIO         => 1.0m,  // Full life coverage (any cause of death)
        PolicyType.VIDA_INTEIRA       => 1.0m,  // Full life coverage (permanent)
        PolicyType.RESGATAVEL         => 1.0m,  // Full life coverage + savings component
        PolicyType.GRUPO_EMPRESARIAL  => 1.0m,  // Full life coverage (portability risk tracked separately)
        PolicyType.ACIDENTES_PESSOAIS => 0.25m, // Accident-only — DATASUS: ~25% das mortes na PEA são por causas externas
        PolicyType.PRESTAMISTA        => 0.0m,  // Pays the LENDER, not the family
        null                          => 1.0m,  // Not informed — assume full coverage
        _ => 1.0m,
    };

    // Score Penalties
    public const int ScorePenaltyLowCoverageWithDependents = 10;
    public const int ScorePenaltyHighDebt = 10;
    public const int ScorePenaltyNoEmergencyFund = 10;
}
