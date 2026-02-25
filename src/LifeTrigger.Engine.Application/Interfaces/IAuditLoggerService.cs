using LifeTrigger.Engine.Domain.Entities;

namespace LifeTrigger.Engine.Application.Interfaces;

public interface IAuditLoggerService
{
    void LogEvaluationCompleted(EvaluationRecord record);
    string MaskString(string? value);
    string CalculateAuditHash(EvaluationRecord record);
}
