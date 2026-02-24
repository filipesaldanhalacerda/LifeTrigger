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
        var evalRecorder = new EvaluationRecorder();

        if (!request.FinancialContext.MonthlyIncome.ExactValue.HasValue || request.FinancialContext.MonthlyIncome.ExactValue.Value <= 0)
        {
            evalRecorder.TrackRule(_ruleJustificationProvider.Build(
                EngineRuleId.RULE_INPUT_INSUFFICIENT_FOR_EVALUATION, 
                new Dictionary<string, RuleArgValue>()));
            
            var earlySnapshot = evalRecorder.FreezeAndGenerateSnapshot();
            
            return new LifeInsuranceAssessmentResult
            {
                RecommendedCoverageAmount = 0m,
                CurrentCoverageAmount = request.FinancialContext.CurrentLifeInsurance?.CoverageAmount ?? 0m,
                ProtectionScore = 0,
                RiskClassification = RiskClassification.CRITICO,
                RecommendedAction = RecommendedAction.REVISAR,
                RegrasAplicadas = earlySnapshot.AppliedRuleIds,
                JustificationsStructured = earlySnapshot.Justifications,
                Audit = new AuditMetadata(
                    EngineVersion: _engineContext.EngineVersion,
                    RuleSetVersion: _engineContext.RuleSetVersion,
                    RuleSetHash: _engineContext.RuleSetHash,
                    AppliedRules: earlySnapshot.AppliedRuleIds,
                    Timestamp: _engineContext.CurrentTime,
                    ConsentId: request.OperationalData.ConsentId
                )
            };
        }

        decimal annualIncome = CalculateAnnualIncome(request.FinancialContext.MonthlyIncome);

        decimal rawRecommendedCoverage = CalculateCoverage(request, annualIncome, evalRecorder, tenantSettings);
        
        decimal finalRecommendedCoverage = ApplyGuardrails(rawRecommendedCoverage, annualIncome, evalRecorder, tenantSettings);

        decimal currentCoverage = request.FinancialContext.CurrentLifeInsurance?.CoverageAmount ?? 0m;
        
        var partialResult = new LifeInsuranceAssessmentResult
        {
            RecommendedCoverageAmount = finalRecommendedCoverage,
            CurrentCoverageAmount = currentCoverage,
        };

        var scoreAndClassification = DetermineScoreAndAction(partialResult, request, annualIncome, evalRecorder);
        
        var finalSnapshot = evalRecorder.FreezeAndGenerateSnapshot();
        
        return partialResult with 
        {
            ProtectionScore = scoreAndClassification.Score,
            RiskClassification = scoreAndClassification.Classification,
            RecommendedAction = scoreAndClassification.Action,
            RegrasAplicadas = finalSnapshot.AppliedRuleIds,
            JustificationsStructured = finalSnapshot.Justifications,
            Audit = new AuditMetadata(
                EngineVersion: _engineContext.EngineVersion,
                RuleSetVersion: _engineContext.RuleSetVersion,
                RuleSetHash: _engineContext.RuleSetHash,
                AppliedRules: finalSnapshot.AppliedRuleIds,
                Timestamp: _engineContext.CurrentTime,
                ConsentId: request.OperationalData.ConsentId
            )
        };
    }

    private decimal CalculateAnnualIncome(IncomeData monthlyIncome)
    {
        return (monthlyIncome.ExactValue ?? 0m) * 12;
    }

    private decimal CalculateCoverage(LifeInsuranceAssessmentRequest request, decimal annualIncome, EvaluationRecorder evalRecorder, TenantSettings? settings)
    {
        decimal incomeReplacementAmount = CalculateIncomeReplacement(annualIncome, request.FamilyContext, evalRecorder, settings);
        decimal debtClearanceAmount = CalculateDebtClearance(request.FinancialContext.Debts, evalRecorder);
        decimal transitionReserveAmount = CalculateTransitionReserve(request.FinancialContext.MonthlyIncome, request.FinancialContext.EmergencyFundMonths, evalRecorder, settings);

        return incomeReplacementAmount + debtClearanceAmount + transitionReserveAmount;
    }

    private decimal CalculateIncomeReplacement(decimal annualIncome, FamilyContext familyContext, EvaluationRecorder evalRecorder, TenantSettings? settings)
    {
        int yearsToReplace = 0;

        if (familyContext.DependentsCount == 0)
        {
            yearsToReplace = settings?.IncomeReplacementYearsSingle ?? CalculationRules.BaseIncomeReplacementYearsNoDependents;
            evalRecorder.TrackRule(_ruleJustificationProvider.Build(
                EngineRuleId.RULE_INCOME_REPLACEMENT_NO_DEPENDENTS, 
                new Dictionary<string, RuleArgValue> { { "years", yearsToReplace } }));
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
            
            evalRecorder.TrackRule(_ruleJustificationProvider.Build(
                EngineRuleId.RULE_INCOME_REPLACEMENT_WITH_DEPENDENTS, 
                new Dictionary<string, RuleArgValue> { 
                    { "years", yearsToReplace }, 
                    { "dependentsCount", familyContext.DependentsCount } 
                }));
        }

        return annualIncome * yearsToReplace;
    }

    private decimal CalculateDebtClearance(DebtData? debts, EvaluationRecorder evalRecorder)
    {
        if (debts == null || debts.TotalAmount <= 0)
        {
            return 0m;
        }

        evalRecorder.TrackRule(_ruleJustificationProvider.Build(
            EngineRuleId.RULE_DEBT_CLEARANCE_FULL, 
            new Dictionary<string, RuleArgValue> { { "amount", debts.TotalAmount } }));
        
        return debts.TotalAmount;
    }

    private decimal CalculateTransitionReserve(IncomeData monthlyIncome, int? emergencyFundMonths, EvaluationRecorder evalRecorder, TenantSettings? settings)
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
            
            evalRecorder.TrackRule(_ruleJustificationProvider.Build(
                EngineRuleId.RULE_TRANSITION_RESERVE_WITH_FUND, 
                new Dictionary<string, RuleArgValue> { 
                    { "bufferMonths", bufferMonths }, 
                    { "currentFundMonths", emergencyFundMonths.Value } 
                }));
        }
        else
        {
            bufferMonths = clampedDefaultBuffer;
            evalRecorder.TrackRule(_ruleJustificationProvider.Build(
                EngineRuleId.RULE_TRANSITION_RESERVE_DEFAULT_NO_FUND, 
                new Dictionary<string, RuleArgValue> { { "bufferMonths", bufferMonths } }));
        }

        return income * bufferMonths;
    }

    private decimal ApplyGuardrails(decimal rawCoverage, decimal annualIncome, EvaluationRecorder evalRecorder, TenantSettings? settings)
    {
        decimal minMult = settings?.MinCoverageAnnualIncomeMultiplier ?? CalculationRules.MinCoverageAnnualIncomeMultiplier;
        decimal maxMult = settings?.MaxTotalCoverageMultiplier ?? CalculationRules.MaxCoverageAnnualIncomeMultiplier;
        
        decimal minCoverage = annualIncome * minMult;
        decimal maxCoverage = annualIncome * maxMult;

        if (rawCoverage < minCoverage)
        {
            evalRecorder.TrackRule(_ruleJustificationProvider.Build(
                EngineRuleId.RULE_GUARDRAIL_MIN_COVERAGE, 
                new Dictionary<string, RuleArgValue> { { "multiplier", minMult } }));
            return minCoverage;
        }

        if (rawCoverage > maxCoverage)
        {
            evalRecorder.TrackRule(_ruleJustificationProvider.Build(
                EngineRuleId.RULE_GUARDRAIL_MAX_COVERAGE, 
                new Dictionary<string, RuleArgValue> { { "multiplier", maxMult } }));
            return maxCoverage;
        }

        return rawCoverage;
    }

    private (int Score, RiskClassification Classification, RecommendedAction Action) DetermineScoreAndAction(
        LifeInsuranceAssessmentResult partialResult, 
        LifeInsuranceAssessmentRequest request, 
        decimal annualIncome,
        EvaluationRecorder evalRecorder)
    {
        RecommendedAction action = DetermineRawAction(partialResult.ProtectionGapPercentage);
        action = ApplyActionOverrides(action, request.OperationalData, evalRecorder);

        int rawScore = CalculateRawScore(partialResult);
        rawScore = AssessPenalties(rawScore, request, annualIncome, evalRecorder);
        
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

    private RecommendedAction ApplyActionOverrides(RecommendedAction currentAction, OperationalData operational, EvaluationRecorder evalRecorder)
    {
        bool needsReview = false;
        
        // Use injected CurrentTime instead of hardcoded DateTimeOffset.UtcNow
        if (operational.LastReviewDate.HasValue && operational.LastReviewDate.Value < _engineContext.CurrentTime.AddMonths(-12))
        {
            needsReview = true;
            evalRecorder.TrackRule(_ruleJustificationProvider.Build(
                EngineRuleId.RULE_ACTION_OVERRIDE_OLD_REVIEW, 
                new Dictionary<string, RuleArgValue>()));
        }
        else if (operational.HasUnconfirmedData)
        {
            needsReview = true;
            evalRecorder.TrackRule(_ruleJustificationProvider.Build(
                EngineRuleId.RULE_ACTION_OVERRIDE_UNCONFIRMED_DATA, 
                new Dictionary<string, RuleArgValue>()));
        }
        else if (operational.RecentLifeTrigger)
        {
            needsReview = true;
            evalRecorder.TrackRule(_ruleJustificationProvider.Build(
                EngineRuleId.RULE_ACTION_OVERRIDE_RECENT_TRIGGER, 
                new Dictionary<string, RuleArgValue>()));
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

    private int AssessPenalties(int rawScore, LifeInsuranceAssessmentRequest request, decimal annualIncome, EvaluationRecorder evalRecorder)
    {
        int score = rawScore;

        if (request.FamilyContext.DependentsCount > 0 && score < 50)
        {
            score -= CalculationRules.ScorePenaltyLowCoverageWithDependents;
            evalRecorder.TrackRule(_ruleJustificationProvider.Build(
                EngineRuleId.RULE_PENALTY_LOW_COVERAGE_DEPENDENTS, 
                new Dictionary<string, RuleArgValue> { { "penaltyPoints", CalculationRules.ScorePenaltyLowCoverageWithDependents } }));
        }

        if (request.FinancialContext.Debts != null && request.FinancialContext.Debts.TotalAmount > (annualIncome / 2m))
        {
            score -= CalculationRules.ScorePenaltyHighDebt;
            evalRecorder.TrackRule(_ruleJustificationProvider.Build(
                EngineRuleId.RULE_PENALTY_HIGH_DEBT, 
                new Dictionary<string, RuleArgValue> { { "penaltyPoints", CalculationRules.ScorePenaltyHighDebt } }));
        }

        if (!request.FinancialContext.EmergencyFundMonths.HasValue || request.FinancialContext.EmergencyFundMonths.Value < 3)
        {
            score -= CalculationRules.ScorePenaltyNoEmergencyFund;
            evalRecorder.TrackRule(_ruleJustificationProvider.Build(
                EngineRuleId.RULE_PENALTY_NO_EMERGENCY_FUND, 
                new Dictionary<string, RuleArgValue> { { "penaltyPoints", CalculationRules.ScorePenaltyNoEmergencyFund } }));
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
