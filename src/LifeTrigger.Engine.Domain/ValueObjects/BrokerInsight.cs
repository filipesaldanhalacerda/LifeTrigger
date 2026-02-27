using LifeTrigger.Engine.Domain.Enums;

namespace LifeTrigger.Engine.Domain.ValueObjects;

/// <summary>
/// A personalized, actionable insight generated for the broker based on the engine result
/// and the client's full profile. Immutable value object — generated once per evaluation.
/// </summary>
public sealed record BrokerInsight
{
    /// <summary>The category of this insight (opening, argument, objection, product, next step).</summary>
    public InsightCategory Category { get; init; }

    /// <summary>Urgency level driven by risk classification and recommended action.</summary>
    public InsightPriority Priority { get; init; }

    /// <summary>
    /// Short action title (~5–8 words) naming the tactic.
    /// Displayed as the card header in the UI.
    /// </summary>
    public string Headline { get; init; } = string.Empty;

    /// <summary>
    /// Full insight text — personalized with the client's numbers, profile, and context.
    /// Ready to be read by the broker before or during the client meeting.
    /// </summary>
    public string Body { get; init; } = string.Empty;
}
