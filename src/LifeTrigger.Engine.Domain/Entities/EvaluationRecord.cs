using System;
using LifeTrigger.Engine.Domain.Enums;
using LifeTrigger.Engine.Domain.Requests;

namespace LifeTrigger.Engine.Domain.Entities;

public record EvaluationRecord(
    Guid Id,
    DateTimeOffset Timestamp,
    string EngineVersion,
    string RuleSetVersion,
    LifeInsuranceAssessmentRequest Request,
    LifeInsuranceAssessmentResult Result,
    string? AuditHash = null,
    Guid? CreatedByUserId = null,
    EvaluationStatus Status = EvaluationStatus.ABERTO
);
