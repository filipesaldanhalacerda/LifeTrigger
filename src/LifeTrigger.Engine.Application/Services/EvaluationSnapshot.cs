using System;
using System.Collections.Generic;
using LifeTrigger.Engine.Domain.Enums;
using LifeTrigger.Engine.Domain.ValueObjects;

namespace LifeTrigger.Engine.Application.Services;

/// <summary>
/// Snapshot Imutável da execução de um Cálculo.
/// Após selado pela classe de negócio, não permite adições secretas,
/// mantendo a integridade das listas para os logs e para a persistência.
/// </summary>
public record EvaluationSnapshot
{
    public IReadOnlyList<string> AppliedRuleIds { get; init; } = Array.Empty<string>();
    public IReadOnlyList<EngineRuleId> AppliedRules { get; init; } = Array.Empty<EngineRuleId>();
    public IReadOnlyList<RuleJustification> Justifications { get; init; } = Array.Empty<RuleJustification>();
    public bool HasInsufficientInputBreak { get; init; } 
}
