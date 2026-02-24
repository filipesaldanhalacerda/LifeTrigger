using LifeTrigger.Engine.Domain.Entities;

namespace LifeTrigger.Engine.Application.Interfaces;

public interface ILifeInsuranceCalculator
{
    LifeInsuranceAssessmentResult Calculate(LifeInsuranceAssessmentRequest request, TenantSettings? tenantSettings = null);
}
