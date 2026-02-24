using System;
using System.Collections.Generic;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Constants;
using LifeTrigger.Engine.Domain.Entities;
using LifeTrigger.Engine.Domain.Enums;
using LifeTrigger.Engine.Domain.Requests;
using LifeTrigger.Engine.Domain.ValueObjects;

namespace LifeTrigger.Engine.Application.Services;

public class LifeInsuranceCalculator : ILifeInsuranceCalculator
{
    public LifeInsuranceAssessmentResult Calculate(LifeInsuranceAssessmentRequest request)
    {
        var appliedRules = new List<string>();
        var justifications = new List<string>();

        decimal annualIncome = CalculateAnnualIncome(request.FinancialContext.MonthlyIncome);

        decimal incomeReplacementAmount = CalculateIncomeReplacement(annualIncome, request.FamilyContext, appliedRules, justifications);
        decimal debtClearanceAmount = CalculateDebtClearance(request.FinancialContext.Debts, appliedRules, justifications);
        decimal transitionReserveAmount = CalculateTransitionReserve(request.FinancialContext.MonthlyIncome, request.FinancialContext.EmergencyFundMonths, appliedRules, justifications);

        decimal rawRecommendedCoverage = incomeReplacementAmount + debtClearanceAmount + transitionReserveAmount;

        decimal finalRecommendedCoverage = ApplyGuardrails(rawRecommendedCoverage, annualIncome, appliedRules, justifications);

        decimal currentCoverage = request.FinancialContext.CurrentLifeInsurance?.CoverageAmount ?? 0m;
        
        var partialResult = new LifeInsuranceAssessmentResult
        {
            RecommendedCoverageAmount = finalRecommendedCoverage,
            CurrentCoverageAmount = currentCoverage,
        };

        var scoreAndClassification = CalculateScoreAndAction(partialResult, request, appliedRules, justifications);
        
        return partialResult with 
        {
            ProtectionScore = scoreAndClassification.Score,
            RiskClassification = scoreAndClassification.Classification,
            RecommendedAction = scoreAndClassification.Action,
            RegrasAplicadas = appliedRules,
            Justificativas = justifications,
            Audit = new AuditMetadata(
                EngineVersion: "1.0.0",
                RuleSetVersion: "2026.02",
                AppliedRules: appliedRules,
                Timestamp: DateTimeOffset.UtcNow,
                ConsentId: request.OperationalData.ConsentId
            )
        };
    }

    private decimal CalculateAnnualIncome(IncomeData monthlyIncome)
    {
        // For deterministic calculation, if exact value is null, a fallback strategy should be defined.
        // For now, if null, we assume 0 or throw an exception if required.
        // Assuming the exact value is provided based on the rules.
        return (monthlyIncome.ExactValue ?? 0m) * 12;
    }

    private decimal CalculateIncomeReplacement(decimal annualIncome, FamilyContext familyContext, List<string> appliedRules, List<string> justifications)
    {
        int yearsToReplace = 0;

        if (familyContext.DependentsCount == 0)
        {
            yearsToReplace = CalculationRules.BaseIncomeReplacementYearsNoDependents;
            appliedRules.Add("RULE_INCOME_REPLACEMENT_NO_DEPENDENTS");
            justifications.Add($"Substituição de renda baseada em {yearsToReplace} anos devido à ausência de dependentes.");
        }
        else
        {
            int extraYears = Math.Min(
                familyContext.DependentsCount * CalculationRules.AdditionalYearsPerDependent,
                CalculationRules.MaxAdditionalYearsForDependents
            );
            
            yearsToReplace = Math.Min(
                CalculationRules.BaseIncomeReplacementYearsWithDependents + extraYears,
                CalculationRules.MaxTotalIncomeReplacementYears
            );
            
            appliedRules.Add("RULE_INCOME_REPLACEMENT_WITH_DEPENDENTS");
            justifications.Add($"Substituição de renda baseada em {yearsToReplace} anos para suprir necessidades de {familyContext.DependentsCount} dependente(s).");
        }

        return annualIncome * yearsToReplace;
    }

    private decimal CalculateDebtClearance(DebtData? debts, List<string> appliedRules, List<string> justifications)
    {
        if (debts == null || debts.TotalAmount <= 0)
        {
            return 0m;
        }

        appliedRules.Add("RULE_DEBT_CLEARANCE_FULL");
        justifications.Add($"Quitação integral de dívidas no valor de {debts.TotalAmount:C}.");
        
        return debts.TotalAmount;
    }

    private decimal CalculateTransitionReserve(IncomeData monthlyIncome, int? emergencyFundMonths, List<string> appliedRules, List<string> justifications)
    {
        decimal income = monthlyIncome.ExactValue ?? 0m;
        int bufferMonths;

        if (emergencyFundMonths.HasValue)
        {
            bufferMonths = Math.Max(
                CalculationRules.MinTransitionReserveBufferMonths, 
                CalculationRules.MaxTransitionReserveBufferMonths - emergencyFundMonths.Value
            );
            
            // Limit the buffer to the max defined (9)
            bufferMonths = Math.Min(bufferMonths, CalculationRules.MaxTransitionReserveBufferMonths);
            
            appliedRules.Add("RULE_TRANSITION_RESERVE_WITH_FUND");
            justifications.Add($"Reserva de transição calculada em {bufferMonths} meses considerando a reserva de emergência atual de {emergencyFundMonths.Value} meses.");
        }
        else
        {
            bufferMonths = CalculationRules.DefaultTransitionReserveMonths;
            appliedRules.Add("RULE_TRANSITION_RESERVE_DEFAULT_NO_FUND");
            justifications.Add($"Reserva de transição padrão aplicada ({bufferMonths} meses) devido à não informação de reserva de emergência.");
        }

        return income * bufferMonths;
    }

    private decimal ApplyGuardrails(decimal rawCoverage, decimal annualIncome, List<string> appliedRules, List<string> justifications)
    {
        decimal minCoverage = annualIncome * CalculationRules.MinCoverageAnnualIncomeMultiplier;
        decimal maxCoverage = annualIncome * CalculationRules.MaxCoverageAnnualIncomeMultiplier;

        if (rawCoverage < minCoverage)
        {
            appliedRules.Add("RULE_GUARDRAIL_MIN_COVERAGE");
            justifications.Add($"A cobertura calculada foi ajustada para o limite mínimo de proteção vital ({CalculationRules.MinCoverageAnnualIncomeMultiplier}x a renda anual).");
            return minCoverage;
        }

        if (rawCoverage > maxCoverage)
        {
            appliedRules.Add("RULE_GUARDRAIL_MAX_COVERAGE");
            justifications.Add($"A cobertura calculada foi limitada ao teto de proteção ({CalculationRules.MaxCoverageAnnualIncomeMultiplier}x a renda anual) para evitar sobreseguro.");
            return maxCoverage;
        }

        return rawCoverage;
    }

    private (int Score, RiskClassification Classification, RecommendedAction Action) CalculateScoreAndAction(
        LifeInsuranceAssessmentResult partialResult, 
        LifeInsuranceAssessmentRequest request, 
        List<string> appliedRules, 
        List<string> justifications)
    {
        // 1. Recommended Action Logic
        RecommendedAction action;
        if (partialResult.ProtectionGapPercentage > 25m)
        {
            action = RecommendedAction.AUMENTAR;
        }
        else if (partialResult.ProtectionGapPercentage < -20m)
        {
            action = RecommendedAction.REDUZIR;
        }
        else
        {
            action = RecommendedAction.MANTER;
        }

        // Action Override: REVISAR
        bool needsReview = false;
        if (request.OperationalData.LastReviewDate.HasValue && request.OperationalData.LastReviewDate.Value < DateTimeOffset.UtcNow.AddMonths(-12))
        {
            needsReview = true;
            justifications.Add("Ação alterada para REVISAR devido à última revisão ter ocorrido há mais de 12 meses.");
            appliedRules.Add("RULE_ACTION_OVERRIDE_OLD_REVIEW");
        }
        else if (request.OperationalData.HasUnconfirmedData)
        {
            needsReview = true;
            justifications.Add("Ação alterada para REVISAR devido à existência de dados essenciais não confirmados.");
            appliedRules.Add("RULE_ACTION_OVERRIDE_UNCONFIRMED_DATA");
        }
        else if (request.OperationalData.RecentLifeTrigger)
        {
            needsReview = true;
            justifications.Add("Ação alterada para REVISAR devido à ocorrência de um gatilho de vida recente.");
            appliedRules.Add("RULE_ACTION_OVERRIDE_RECENT_TRIGGER");
        }

        if (needsReview)
        {
            action = RecommendedAction.REVISAR;
        }

        // 2. Score Logic
        decimal baseScoreDecimal = partialResult.RecommendedCoverageAmount > 0 
            ? (partialResult.CurrentCoverageAmount / partialResult.RecommendedCoverageAmount) * 100m 
            : 100m;
            
        int score = (int)Math.Min(100, Math.Max(0, Math.Round(baseScoreDecimal)));
        
        // Apply penalties
        if (request.FamilyContext.DependentsCount > 0 && score < 50)
        {
            score -= CalculationRules.ScorePenaltyLowCoverageWithDependents;
            appliedRules.Add("RULE_PENALTY_LOW_COVERAGE_DEPENDENTS");
            justifications.Add($"Penalidade de {CalculationRules.ScorePenaltyLowCoverageWithDependents} pontos aplicada no score devido à baixa cobertura com dependentes.");
        }

        decimal annualIncome = CalculateAnnualIncome(request.FinancialContext.MonthlyIncome);
        if (request.FinancialContext.Debts != null && request.FinancialContext.Debts.TotalAmount > (annualIncome / 2m))
        {
            score -= CalculationRules.ScorePenaltyHighDebt;
            appliedRules.Add("RULE_PENALTY_HIGH_DEBT");
            justifications.Add($"Penalidade de {CalculationRules.ScorePenaltyHighDebt} pontos aplicada no score devido ao alto nível de endividamento (> 50% da renda anual).");
        }

        if (!request.FinancialContext.EmergencyFundMonths.HasValue || request.FinancialContext.EmergencyFundMonths.Value < 3)
        {
            score -= CalculationRules.ScorePenaltyNoEmergencyFund;
            appliedRules.Add("RULE_PENALTY_NO_EMERGENCY_FUND");
            justifications.Add($"Penalidade de {CalculationRules.ScorePenaltyNoEmergencyFund} pontos aplicada no score devido à ausência de reserva de emergência mínima (3 meses).");
        }

        score = Math.Max(0, score); // cap min at 0

        // 3. Risk Classification
        RiskClassification classification;
        if (score < 30)
        {
            classification = RiskClassification.CRITICO;
        }
        else if (score < 70)
        {
            classification = RiskClassification.MODERADO;
        }
        else
        {
            classification = RiskClassification.ADEQUADO;
        }

        return (score, classification, action);
    }
}
