using System.Collections.Generic;
using LifeTrigger.Engine.Domain.Entities;
using LifeTrigger.Engine.Domain.ValueObjects;

namespace LifeTrigger.Engine.Application.Interfaces;

/// <summary>
/// Generates personalized broker insights from a completed evaluation result and the
/// original request. Pure domain logic — no external dependencies.
/// </summary>
public interface IBrokerInsightGenerator
{
    /// <summary>
    /// Produces an ordered list of actionable insights (ABERTURA → ARGUMENTO_PRINCIPAL →
    /// OBJECAO_PREVISTA → PRODUTO_SUGERIDO → PROXIMO_PASSO) tailored to the specific
    /// combination of risk, gap, demographics, and financial profile detected by the engine.
    /// </summary>
    IReadOnlyList<BrokerInsight> Generate(
        LifeInsuranceAssessmentResult result,
        LifeInsuranceAssessmentRequest request);
}
