namespace LifeTrigger.Engine.Domain.Entities;

using LifeTrigger.Engine.Domain.Requests;

public record LifeInsuranceAssessmentRequest(
    PersonalContext PersonalContext,
    FinancialContext FinancialContext,
    FamilyContext FamilyContext,
    OperationalData OperationalData
);
