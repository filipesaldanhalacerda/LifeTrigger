using System;
using System.Collections.Generic;
using System.Linq;
using LifeTrigger.Engine.Domain.Enums;

using LifeTrigger.Engine.Domain.ValueObjects;

namespace LifeTrigger.Engine.Domain.Constants;

/// <summary>
/// Contrato de templates para as regras atuariais.
/// Garante que o motor de cálculo nunca pule a injeção de parâmetros obrigatórios
/// e amarra a Enum a uma `TemplateId` fixa e a um `MessageKey` (i18n).
/// </summary>
public static class JustificationTemplateRegistry
{
    private static readonly IReadOnlyDictionary<EngineRuleId, (string TemplateId, string MessageKey, string[] RequiredKeys)> _registry = 
        new Dictionary<EngineRuleId, (string, string, string[])>
    {
        { EngineRuleId.RULE_INCOME_REPLACEMENT_NO_DEPENDENTS, ("RULE_INCOME_REPLACEMENT_NO_DEPENDENTS_V1", "rules.income_replacement_no_dependents", new[] { "years" }) },
        { EngineRuleId.RULE_INCOME_REPLACEMENT_WITH_DEPENDENTS, ("RULE_INCOME_REPLACEMENT_WITH_DEPENDENTS_V1", "rules.income_replacement_with_dependents", new[] { "years", "dependentsCount" }) },
        { EngineRuleId.RULE_INPUT_INSUFFICIENT_FOR_EVALUATION, ("RULE_INPUT_INSUFFICIENT_FOR_EVALUATION_V1", "rules.input_insufficient_for_evaluation", Array.Empty<string>()) },
        { EngineRuleId.RULE_DEBT_CLEARANCE_FULL, ("RULE_DEBT_CLEARANCE_FULL_V1", "rules.debt_clearance_full", new[] { "amount" }) },
        { EngineRuleId.RULE_TRANSITION_RESERVE_WITH_FUND, ("RULE_TRANSITION_RESERVE_WITH_FUND_V1", "rules.transition_reserve_with_fund", new[] { "bufferMonths", "currentFundMonths" }) },
        { EngineRuleId.RULE_TRANSITION_RESERVE_DEFAULT_NO_FUND, ("RULE_TRANSITION_RESERVE_DEFAULT_NO_FUND_V1", "rules.transition_reserve_default_no_fund", new[] { "bufferMonths" }) },
        { EngineRuleId.RULE_GUARDRAIL_MIN_COVERAGE, ("RULE_GUARDRAIL_MIN_COVERAGE_V1", "rules.guardrail_min_coverage", new[] { "multiplier" }) },
        { EngineRuleId.RULE_GUARDRAIL_MAX_COVERAGE, ("RULE_GUARDRAIL_MAX_COVERAGE_V1", "rules.guardrail_max_coverage", new[] { "multiplier" }) },
        { EngineRuleId.RULE_PENALTY_LOW_COVERAGE_DEPENDENTS, ("RULE_PENALTY_LOW_COVERAGE_DEPENDENTS_V1", "rules.penalty_low_coverage_dependents", new[] { "penaltyPoints" }) },
        { EngineRuleId.RULE_PENALTY_HIGH_DEBT, ("RULE_PENALTY_HIGH_DEBT_V1", "rules.penalty_high_debt", new[] { "penaltyPoints" }) },
        { EngineRuleId.RULE_PENALTY_NO_EMERGENCY_FUND, ("RULE_PENALTY_NO_EMERGENCY_FUND_V1", "rules.penalty_no_emergency_fund", new[] { "penaltyPoints" }) },
        { EngineRuleId.RULE_EDUCATION_COSTS, ("RULE_EDUCATION_COSTS_V1", "rules.education_costs", new[] { "amount" }) },
        { EngineRuleId.RULE_ITCMD_ESTATE_TAX, ("RULE_ITCMD_ESTATE_TAX_V1", "rules.itcmd_estate_tax", new[] { "estateValue", "rate", "amount", "state" }) },
        { EngineRuleId.RULE_INVENTORY_COSTS, ("RULE_INVENTORY_COSTS_V1", "rules.inventory_costs", new[] { "estateValue", "rate", "amount" }) },
        { EngineRuleId.RULE_ACTION_OVERRIDE_OLD_REVIEW, ("RULE_ACTION_OVERRIDE_OLD_REVIEW_V1", "rules.action_override_old_review", Array.Empty<string>()) },
        { EngineRuleId.RULE_ACTION_OVERRIDE_UNCONFIRMED_DATA, ("RULE_ACTION_OVERRIDE_UNCONFIRMED_DATA_V1", "rules.action_override_unconfirmed_data", Array.Empty<string>()) },
        { EngineRuleId.RULE_ACTION_OVERRIDE_RECENT_TRIGGER, ("RULE_ACTION_OVERRIDE_RECENT_TRIGGER_V1", "rules.action_override_recent_trigger", Array.Empty<string>()) }
    };

    /// <summary>
    /// Resgata o template atrelado à regra e valida se todos os chaves numéricas requeridas foram supridas pelo motor.
    /// Lança InvalidOperationException agressiva em caso de infração de contrato (quebra de testes automáticos).
    /// </summary>
    public static (string TemplateId, string MessageKey) GetTemplateAndValidateState(EngineRuleId ruleId, IDictionary<string, RuleArgValue> args)
    {
        if (!_registry.TryGetValue(ruleId, out var mapping))
        {
            throw new InvalidOperationException($"ORPHAN RULE EXCEPTION: EngineRuleId '{ruleId}' is not catalogued in the JustificationTemplateRegistry. " +
                "All rules must have an explicit mapping to prevent untracked backend alterations.");
        }

        var missingKeys = mapping.RequiredKeys.Where(k => !args.ContainsKey(k)).ToList();
        if (missingKeys.Any())
        {
            throw new InvalidOperationException($"MISSING ARGUMENTS EXCEPTION: Rule '{ruleId}' requires args: [{string.Join(", ", missingKeys)}], " +
                "but they were not provided by the calculator. Incomplete telemetry compromises the justification render pipeline.");
        }

        return (mapping.TemplateId, mapping.MessageKey);
    }
}
