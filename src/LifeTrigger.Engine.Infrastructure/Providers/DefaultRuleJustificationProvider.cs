using System.Collections.Generic;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Constants;
using LifeTrigger.Engine.Domain.Enums;
using LifeTrigger.Engine.Domain.ValueObjects;

namespace LifeTrigger.Engine.Infrastructure.Providers;

public class DefaultRuleJustificationProvider : IRuleJustificationProvider
{
    public RuleJustification Build(EngineRuleId ruleId, IDictionary<string, RuleArgValue> args)
    {
        // 1. Validate if rule dictates require specific arguments (amount, years, dependents)
        // 2. Fetch locked robust template id and i18n message key
        var (templateId, messageKey) = JustificationTemplateRegistry.GetTemplateAndValidateState(ruleId, args);

        // 3. Mount deterministic and immutable ValueObject preserving raw calculation metrics
        return new RuleJustification(ruleId, templateId, messageKey, args);
    }
}
