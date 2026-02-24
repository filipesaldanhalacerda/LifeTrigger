using System.Collections.Generic;
using LifeTrigger.Engine.Domain.Enums;
using LifeTrigger.Engine.Domain.ValueObjects;

namespace LifeTrigger.Engine.Application.Interfaces;

/// <summary>
/// Provedor isolado que garante a injeção estrita de TemplateIds e argumentos
/// na criação do ValueObject (RuleJustification) durante a execução atuarial do motor.
/// </summary>
public interface IRuleJustificationProvider
{
    RuleJustification Build(EngineRuleId ruleId, IDictionary<string, RuleArgValue> args);
}
