using LifeTrigger.Engine.Domain.Enums;

namespace LifeTrigger.Engine.Domain.Requests;

public record CurrentInsuranceData(
    decimal CoverageAmount,
    PolicyType? PolicyType
);
