using LifeTrigger.Engine.Domain.Enums;

namespace LifeTrigger.Engine.Domain.Requests;

public record PersonalContext(
    int Age,
    MaritalStatus? MaritalStatus,
    ProfessionRiskLevel ProfessionRiskLevel,
    bool? IsSmoker
);
