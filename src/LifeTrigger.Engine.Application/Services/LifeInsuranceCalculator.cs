using System;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Constants;
using LifeTrigger.Engine.Domain.Entities;
using LifeTrigger.Engine.Domain.Enums;
using LifeTrigger.Engine.Domain.Requests;
using LifeTrigger.Engine.Domain.ValueObjects;

namespace LifeTrigger.Engine.Application.Services;

public class LifeInsuranceCalculator : ILifeInsuranceCalculator
{
    private readonly IEngineContext _engineContext;
    private readonly IRuleJustificationProvider _ruleJustificationProvider;

    public LifeInsuranceCalculator(IEngineContext engineContext, IRuleJustificationProvider ruleJustificationProvider)
    {
        _engineContext = engineContext;
        _ruleJustificationProvider = ruleJustificationProvider;
    }

    public LifeInsuranceAssessmentResult Calculate(LifeInsuranceAssessmentRequest request, TenantSettings? tenantSettings = null)
    {
        var evalContext = new EvaluationContext();

        decimal annualIncome = CalculateAnnualIncome(request.FinancialContext.MonthlyIncome);

        decimal rawRecommendedCoverage = CalculateCoverage(request, annualIncome, evalContext, tenantSettings);
        
        decimal finalRecommendedCoverage = ApplyGuardrails(rawRecommendedCoverage, annualIncome, evalContext, tenantSettings);

        decimal currentCoverage = request.FinancialContext.CurrentLifeInsurance?.CoverageAmount ?? 0m;
        
        var partialResult = new LifeInsuranceAssessmentResult
        {
            RecommendedCoverageAmount = finalRecommendedCoverage,
            CurrentCoverageAmount = currentCoverage,
        };

        var scoreAndClassification = DetermineScoreAndAction(partialResult, request, annualIncome, evalContext);
        
        return partialResult with 
        {
            ProtectionScore = scoreAndClassification.Score,
            RiskClassification = scoreAndClassification.Classification,
            RecommendedAction = scoreAndClassification.Action,
            RegrasAplicadas = [.. evalContext.AppliedRules],
            Justificativas = [.. evalContext.Justifications],
            Audit = new AuditMetadata(
                EngineVersion: _engineContext.EngineVersion,
                RuleSetVersion: _engineContext.RuleSetVersion,
                AppliedRules: [.. evalContext.AppliedRules],
                Timestamp: _engineContext.CurrentTime,
                ConsentId: request.OperationalData.ConsentId
            )
        };
    }

    private decimal CalculateAnnualIncome(IncomeData monthlyIncome)
    {
        return (monthlyIncome.ExactValue ?? 0m) * 12;
    }

    private decimal CalculateCoverage(LifeInsuranceAssessmentRequest request, decimal annualIncome, EvaluationContext evalContext, TenantSettings? settings)
    {
        decimal incomeReplacementAmount = CalculateIncomeReplacement(annualIncome, request.FamilyContext, evalContext, settings);
        decimal debtClearanceAmount = CalculateDebtClearance(request.FinancialContext.Debts, evalContext);
        decimal transitionReserveAmount = CalculateTransitionReserve(request.FinancialContext.MonthlyIncome, request.FinancialContext.EmergencyFundMonths, evalContext, settings);

        return incomeReplacementAmount + debtClearanceAmount + transitionReserveAmount;
    }

    private decimal CalculateIncomeReplacement(decimal annualIncome, FamilyContext familyContext, EvaluationContext evalContext, TenantSettings? settings)
    {
        int yearsToReplace = 0;

        if (familyContext.DependentsCount == 0)
        {
            yearsToReplace = settings?.IncomeReplacementYearsSingle ?? CalculationRules.BaseIncomeReplacementYearsNoDependents;
            evalContext.TrackRule(EngineRules.IncomeReplacementNoDependents, 
                _ruleJustificationProvider.GetJustification(EngineRules.IncomeReplacementNoDependents, yearsToReplace));
        }
        else
        {
            int baseYearsDep = settings?.IncomeReplacementYearsWithDependents ?? CalculationRules.BaseIncomeReplacementYearsWithDependents;
            
            int extraYears = Math.Min(
                familyContext.DependentsCount * CalculationRules.AdditionalYearsPerDependent,
                CalculationRules.MaxAdditionalYearsForDependents
            );
            
            yearsToReplace = Math.Min(
                baseYearsDep + extraYears,
                CalculationRules.MaxTotalIncomeReplacementYears
            );
            
            evalContext.TrackRule(EngineRules.IncomeReplacementWithDependents, 
                _ruleJustificationProvider.GetJustification(EngineRules.IncomeReplacementWithDependents, yearsToReplace, familyContext.DependentsCount));
        }

        return annualIncome * yearsToReplace;
    }

    private decimal CalculateDebtClearance(DebtData? debts, EvaluationContext evalContext)
    {
        if (debts == null || debts.TotalAmount <= 0)
        {
            return 0m;
        }

        evalContext.TrackRule(EngineRules.DebtClearanceFull, 
            _ruleJustificationProvider.GetJustification(EngineRules.DebtClearanceFull, debts.TotalAmount));
        
        return debts.TotalAmount;
    }

    private decimal CalculateTransitionReserve(IncomeData monthlyIncome, int? emergencyFundMonths, EvaluationContext evalContext, TenantSettings? settings)
    {
        decimal income = monthlyIncome.ExactValue ?? 0m;
        int bufferMonths;

        int defaultBuffer = settings?.EmergencyFundBufferMonths ?? CalculationRules.DefaultTransitionReserveMonths;
        // Vulnerability Fix: Strict Clamping. Max buffer cannot exceed matrix Max, Min cannot exceed matrix Min.
        int clampedDefaultBuffer = Math.Clamp(defaultBuffer, CalculationRules.MinTransitionReserveBufferMonths, CalculationRules.MaxTransitionReserveBufferMonths);

        if (emergencyFundMonths.HasValue)
        {
            // Transition Gap = Target Buffer - Current Reserve. Min floor is MinTransitionReserveBufferMonths. 
            // Max is clampedDefaultBuffer. 
            bufferMonths = Math.Max(
                CalculationRules.MinTransitionReserveBufferMonths, 
                clampedDefaultBuffer - emergencyFundMonths.Value
            );
            
            // Restores the rigid ceiling:
            bufferMonths = Math.Min(bufferMonths, clampedDefaultBuffer);
            
            evalContext.TrackRule(EngineRules.TransitionReserveWithFund, 
                _ruleJustificationProvider.GetJustification(EngineRules.TransitionReserveWithFund, bufferMonths, emergencyFundMonths.Value));
        }
        else
        {
            bufferMonths = clampedDefaultBuffer;
            evalContext.TrackRule(EngineRules.TransitionReserveDefaultNoFund, 
                _ruleJustificationProvider.GetJustification(EngineRules.TransitionReserveDefaultNoFund, bufferMonths));
        }

        return income * bufferMonths;
    }

    private decimal ApplyGuardrails(decimal rawCoverage, decimal annualIncome, EvaluationContext evalContext, TenantSettings? settings)
    {
        decimal minMult = settings?.MinCoverageAnnualIncomeMultiplier ?? CalculationRules.MinCoverageAnnualIncomeMultiplier;
        decimal maxMult = settings?.MaxTotalCoverageMultiplier ?? CalculationRules.MaxCoverageAnnualIncomeMultiplier;
        
        decimal minCoverage = annualIncome * minMult;
        decimal maxCoverage = annualIncome * maxMult;

        if (rawCoverage < minCoverage)
        {
            evalContext.TrackRule(EngineRules.GuardrailMinCoverage, 
                _ruleJustificationProvider.GetJustification(EngineRules.GuardrailMinCoverage, minMult));
            return minCoverage;
        }

        if (rawCoverage > maxCoverage)
        {
            evalContext.TrackRule(EngineRules.GuardrailMaxCoverage, 
                _ruleJustificationProvider.GetJustification(EngineRules.GuardrailMaxCoverage, maxMult));
            return maxCoverage;
        }

        return rawCoverage;
    }

    private (int Score, RiskClassification Classification, RecommendedAction Action) DetermineScoreAndAction(
        LifeInsuranceAssessmentResult partialResult, 
        LifeInsuranceAssessmentRequest request, 
        decimal annualIncome,
        EvaluationContext evalContext)
    {
        RecommendedAction action = DetermineRawAction(partialResult.ProtectionGapPercentage);
        action = ApplyActionOverrides(action, request.OperationalData, evalContext);

        int rawScore = CalculateRawScore(partialResult);
        rawScore = AssessPenalties(rawScore, request, annualIncome, evalContext);
        
        // Defer Score Clamp to the absolute last arithmetic step
        int finalScore = Math.Clamp(rawScore, 0, 100);

        RiskClassification classification = DetermineRiskClassification(finalScore);

        return (finalScore, classification, action);
    }

    private RecommendedAction DetermineRawAction(decimal protectionGapPercentage)
    {
        if (protectionGapPercentage > 25m) return RecommendedAction.AUMENTAR;
        if (protectionGapPercentage < -20m) return RecommendedAction.REDUZIR;
        return RecommendedAction.MANTER;
    }

    private RecommendedAction ApplyActionOverrides(RecommendedAction currentAction, OperationalData operational, EvaluationContext evalContext)
    {
        bool needsReview = false;
        
        // Use injected CurrentTime instead of hardcoded DateTimeOffset.UtcNow
        if (operational.LastReviewDate.HasValue && operational.LastReviewDate.Value < _engineContext.CurrentTime.AddMonths(-12))
        {
            needsReview = true;
            evalContext.TrackRule(EngineRules.ActionOverrideOldReview, _ruleJustificationProvider.GetJustification(EngineRules.ActionOverrideOldReview));
        }
        else if (operational.HasUnconfirmedData)
        {
            needsReview = true;
            evalContext.TrackRule(EngineRules.ActionOverrideUnconfirmedData, _ruleJustificationProvider.GetJustification(EngineRules.ActionOverrideUnconfirmedData));
        }
        else if (operational.RecentLifeTrigger)
        {
            needsReview = true;
            evalContext.TrackRule(EngineRules.ActionOverrideRecentTrigger, _ruleJustificationProvider.GetJustification(EngineRules.ActionOverrideRecentTrigger));
        }

        return needsReview ? RecommendedAction.REVISAR : currentAction;
    }

    private int CalculateRawScore(LifeInsuranceAssessmentResult partialResult)
    {
        decimal baseScoreDecimal = partialResult.RecommendedCoverageAmount > 0 
            ? (partialResult.CurrentCoverageAmount / partialResult.RecommendedCoverageAmount) * 100m 
            : 100m;
            
        return (int)Math.Round(baseScoreDecimal);
    }

    private int AssessPenalties(int rawScore, LifeInsuranceAssessmentRequest request, decimal annualIncome, EvaluationContext evalContext)
    {
        int score = rawScore;

        if (request.FamilyContext.DependentsCount > 0 && score < 50)
        {
            score -= CalculationRules.ScorePenaltyLowCoverageWithDependents;
            evalContext.TrackRule(EngineRules.PenaltyLowCoverageDependents, 
                _ruleJustificationProvider.GetJustification(EngineRules.PenaltyLowCoverageDependents, CalculationRules.ScorePenaltyLowCoverageWithDependents));
        }

        if (request.FinancialContext.Debts != null && request.FinancialContext.Debts.TotalAmount > (annualIncome / 2m))
        {
            score -= CalculationRules.ScorePenaltyHighDebt;
            evalContext.TrackRule(EngineRules.PenaltyHighDebt, 
                _ruleJustificationProvider.GetJustification(EngineRules.PenaltyHighDebt, CalculationRules.ScorePenaltyHighDebt));
        }

        if (!request.FinancialContext.EmergencyFundMonths.HasValue || request.FinancialContext.EmergencyFundMonths.Value < 3)
        {
            score -= CalculationRules.ScorePenaltyNoEmergencyFund;
            evalContext.TrackRule(EngineRules.PenaltyNoEmergencyFund, 
                _ruleJustificationProvider.GetJustification(EngineRules.PenaltyNoEmergencyFund, CalculationRules.ScorePenaltyNoEmergencyFund));
        }

        return score;
    }

    private RiskClassification DetermineRiskClassification(int finalScore)
    {
        if (finalScore < 30) return RiskClassification.CRITICO;
        if (finalScore < 70) return RiskClassification.MODERADO;
        return RiskClassification.ADEQUADO;
    }
}
