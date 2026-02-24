using System.Collections.Generic;

namespace LifeTrigger.Engine.Application.Services;

/// <summary>
/// Rastreador de contexto imutável encapsulado. Bloqueia efeitos colaterais de listas repassadas livremente no Motor.
/// </summary>
public class EvaluationContext
{
    private readonly List<string> _appliedRules = new();
    private readonly List<string> _justifications = new();

    public IReadOnlyList<string> AppliedRules => _appliedRules.AsReadOnly();
    public IReadOnlyList<string> Justifications => _justifications.AsReadOnly();

    public void TrackRule(string ruleId, string justificationText)
    {
        _appliedRules.Add(ruleId);
        _justifications.Add(justificationText);
    }
}
