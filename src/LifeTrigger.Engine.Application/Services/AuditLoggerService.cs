using System;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using LifeTrigger.Engine.Domain.Requests;
using LifeTrigger.Engine.Domain.Entities;
using System.Text.Json;

namespace LifeTrigger.Engine.Application.Services;

public interface IAuditLoggerService
{
    void LogEvaluationCompleted(EvaluationRecord record);
    string MaskString(string? value);
    string CalculateAuditHash(EvaluationRecord record);
}

public class AuditLoggerService : IAuditLoggerService
{
    private readonly ILogger<AuditLoggerService> _logger;

    public AuditLoggerService(ILogger<AuditLoggerService> logger)
    {
        _logger = logger;
    }

    public void LogEvaluationCompleted(EvaluationRecord record)
    {
        // Mascarar dados pessoais PII do request antes do log estruturado.
        var maskedRequest = MaskRequestData(record.Request);
        
        string payloadJson = JsonSerializer.Serialize(maskedRequest);
        string auditMetadataJson = JsonSerializer.Serialize(record.Result.Audit);

        _logger.LogInformation(
            "Evaluation Completed - Ref: {EvaluationId} | Engine: {EngineVersion} | Rules: {RuleSetVersion} | " +
            "RequestPayload: {Payload} | ResultGap: {ProtectionGap} | AppliedRules: {AppliedRules}",
            record.Id,
            record.EngineVersion,
            record.RuleSetVersion,
            payloadJson,
            record.Result.ProtectionGapAmount,
            auditMetadataJson
        );
    }

    public string MaskString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        int length = value.Length;

        if (length <= 4)
        {
            return new string('*', length);
        }

        string visibleEnd = value.Substring(length - 4);
        string maskedStart = new string('*', length - 4);

        return maskedStart + visibleEnd;
    }

    private LifeInsuranceAssessmentRequest MaskRequestData(LifeInsuranceAssessmentRequest original)
    {
        return original with
        {
            OperationalData = original.OperationalData with
            {
                ConsentId = MaskString(original.OperationalData.ConsentId)
            }
        };
    }

    public string CalculateAuditHash(EvaluationRecord record)
    {
        // 1. Serialize minimal canonical inputs guaranteeing mathematical representation
        string rawCanonicalPayload = JsonSerializer.Serialize(new 
        {
            // Deterministic inputs
            Age = record.Request.PersonalContext.Age,
            Income = record.Request.FinancialContext.MonthlyIncome?.ExactValue ?? 0m,
            Debts = record.Request.FinancialContext.Debts?.TotalAmount ?? 0m,
            Coverage = record.Request.FinancialContext.CurrentLifeInsurance?.CoverageAmount ?? 0m,
            
            // Deterministic outputs (Rules and Action)
            Rules = record.Result.RegrasAplicadas,
            Action = record.Result.RecommendedAction.ToString(),
            Score = record.Result.ProtectionScore,
            
            // Versioning and Traceability lock
            Engine = record.EngineVersion,
            Ruleset = record.RuleSetVersion,
            Timestamp = record.Timestamp.ToUnixTimeSeconds()
        });

        // 2. Hash computation
        using (SHA256 sha256Hash = SHA256.Create())
        {
            byte[] bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(rawCanonicalPayload));

            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < bytes.Length; i++)
            {
                builder.Append(bytes[i].ToString("x2"));
            }
            return builder.ToString();
        }
    }
}
