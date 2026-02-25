using System;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using LifeTrigger.Engine.Domain.Requests;
using LifeTrigger.Engine.Domain.Entities;
using LifeTrigger.Engine.Application.Interfaces;
using System.Text.Json;

namespace LifeTrigger.Engine.Application.Services;

public class AuditLoggerService : IAuditLoggerService
{
    private readonly ILogger<AuditLoggerService> _logger;

    public AuditLoggerService(ILogger<AuditLoggerService> logger)
    {
        _logger = logger;
    }

    public void LogEvaluationCompleted(EvaluationRecord record)
    {
        // Campos financeiros e demográficos mascarados por LGPD
        var maskedRequest = MaskRequestData(record.Request);

        _logger.LogInformation(
            "Evaluation completed. Id={EvaluationId} Engine={EngineVersion} RuleSet={RuleSetVersion} " +
            "Channel={Channel} TenantId={TenantId} ConsentId={ConsentId} " +
            "ProtectionGap={ProtectionGapAmount} Score={ProtectionScore} Action={RecommendedAction} AppliedRules={AppliedRulesCount}",
            record.Id,
            record.EngineVersion,
            record.RuleSetVersion,
            maskedRequest.OperationalData.OriginChannel,
            record.Request.OperationalData.TenantId,
            maskedRequest.OperationalData.ConsentId,
            record.Result.ProtectionGapAmount,
            record.Result.ProtectionScore,
            record.Result.RecommendedAction,
            record.Result.Audit.AppliedRules.Count
        );
    }

    public string MaskString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        int length = value.Length;

        if (length <= 4)
            return new string('*', length);

        return new string('*', length - 4) + value.Substring(length - 4);
    }

    private LifeInsuranceAssessmentRequest MaskRequestData(LifeInsuranceAssessmentRequest original)
    {
        return original with
        {
            OperationalData = original.OperationalData with
            {
                ConsentId = MaskString(original.OperationalData.ConsentId)
            },
            PersonalContext = original.PersonalContext with
            {
                Age = (original.PersonalContext.Age / 10) * 10
            },
            FinancialContext = original.FinancialContext with
            {
                MonthlyIncome = original.FinancialContext.MonthlyIncome with
                {
                    ExactValue = null
                },
                Debts = original.FinancialContext.Debts != null
                    ? original.FinancialContext.Debts with { TotalAmount = 0 }
                    : null,
                CurrentLifeInsurance = original.FinancialContext.CurrentLifeInsurance != null
                    ? original.FinancialContext.CurrentLifeInsurance with { CoverageAmount = 0 }
                    : null
            }
        };
    }

    public string CalculateAuditHash(EvaluationRecord record)
    {
        string rawCanonicalPayload = JsonSerializer.Serialize(new
        {
            Age = record.Request.PersonalContext.Age,
            Income = record.Request.FinancialContext.MonthlyIncome?.ExactValue ?? 0m,
            Debts = record.Request.FinancialContext.Debts?.TotalAmount ?? 0m,
            Coverage = record.Request.FinancialContext.CurrentLifeInsurance?.CoverageAmount ?? 0m,
            Rules = record.Result.RegrasAplicadas,
            Action = record.Result.RecommendedAction.ToString(),
            Score = record.Result.ProtectionScore,
            Engine = record.EngineVersion,
            Ruleset = record.RuleSetVersion,
            Timestamp = record.Timestamp.ToUnixTimeSeconds()
        });

        byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawCanonicalPayload));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
