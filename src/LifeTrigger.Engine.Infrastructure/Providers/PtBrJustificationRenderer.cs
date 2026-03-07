using System;
using System.Collections.Generic;
using System.Globalization;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Enums;
using LifeTrigger.Engine.Domain.ValueObjects;

namespace LifeTrigger.Engine.Infrastructure.Providers;

public class PtBrJustificationRenderer : IRuleJustificationRenderer
{
    private static readonly CultureInfo _ptBrCulture = new("pt-BR");

    private static readonly Dictionary<string, string> _ptBrTexts = new()
    {
        { "rules.income_replacement_no_dependents", "Substituição de renda baseada em {0} anos devido à ausência de dependentes." },
        { "rules.income_replacement_with_dependents", "Substituição de renda baseada em {0} anos para suprir necessidades de {1} dependente(s)." },
        { "rules.input_insufficient_for_evaluation", "Renda mensal bruta não informada ou zero; cálculo abortado deterministicamente." },
        { "rules.debt_clearance_full", "Quitação integral de dívidas no valor de {0:C}." },
        { "rules.transition_reserve_with_fund", "Reserva de transição calculada em {0} meses considerando a reserva de emergência atual de {1} meses." },
        { "rules.transition_reserve_default_no_fund", "Reserva de transição padrão aplicada ({0} meses) devido à não informação de reserva de emergência." },
        { "rules.guardrail_min_coverage", "A cobertura calculada foi ajustada para o limite mínimo de proteção vital ({0}x a renda anual)." },
        { "rules.guardrail_max_coverage", "A cobertura calculada foi limitada ao teto de proteção ({0}x a renda anual) para evitar sobreseguro." },
        { "rules.penalty_low_coverage_dependents", "Penalidade de {0} pontos aplicada no score devido à baixa cobertura com dependentes." },
        { "rules.penalty_high_debt", "Penalidade de {0} pontos aplicada no score devido ao alto nível de endividamento (> 50% da renda anual)." },
        { "rules.penalty_no_emergency_fund", "Penalidade de {0} pontos aplicada no score devido à ausência de reserva de emergência mínima (3 meses)." },
        { "rules.education_costs", "Custos de educação dos dependentes no valor estimado de {0:C} adicionados à cobertura recomendada." },
        { "rules.itcmd_estate_tax", "ITCMD calculado sobre patrimônio de {0:C} à alíquota de {1:F0}% (estado {2}), totalizando {3:C}." },
        { "rules.inventory_costs", "Custos de inventário e honorários calculados sobre patrimônio de {0:C} à taxa de {1:F0}%, totalizando {2:C}." },
        { "rules.action_override_old_review", "Ação alterada para REVISAR devido à última revisão ter ocorrido há mais de 12 meses." },
        { "rules.action_override_unconfirmed_data", "Ação alterada para REVISAR devido à existência de dados essenciais não confirmados." },
        { "rules.action_override_recent_trigger", "Ação alterada para REVISAR devido à ocorrência de um gatilho de vida recente." }
    };

    public string Render(RuleJustification justification)
    {
        if (!_ptBrTexts.TryGetValue(justification.MessageKey, out var template))
        {
            return $"Regra {justification.RuleId} aplicada [{justification.TemplateId} / {justification.MessageKey}].";
        }

        // Map arguments linearly based on the structured contract to fit string.Format
        var formatArgs = ExtractOrderedArgumentsForTemplate(justification.RuleId, justification.Args);
        
        return string.Format(_ptBrCulture, template, formatArgs);
    }

    private object[] ExtractOrderedArgumentsForTemplate(EngineRuleId ruleId, IReadOnlyDictionary<string, RuleArgValue> args)
    {
        return ruleId switch
        {
            EngineRuleId.RULE_INCOME_REPLACEMENT_NO_DEPENDENTS => new[] { args["years"].GetValue() },
            EngineRuleId.RULE_INCOME_REPLACEMENT_WITH_DEPENDENTS => new[] { args["years"].GetValue(), args["dependentsCount"].GetValue() },
            EngineRuleId.RULE_DEBT_CLEARANCE_FULL => new[] { args["amount"].GetValue() },
            EngineRuleId.RULE_TRANSITION_RESERVE_WITH_FUND => new[] { args["bufferMonths"].GetValue(), args["currentFundMonths"].GetValue() },
            EngineRuleId.RULE_TRANSITION_RESERVE_DEFAULT_NO_FUND => new[] { args["bufferMonths"].GetValue() },
            EngineRuleId.RULE_GUARDRAIL_MIN_COVERAGE => new[] { args["multiplier"].GetValue() },
            EngineRuleId.RULE_GUARDRAIL_MAX_COVERAGE => new[] { args["multiplier"].GetValue() },
            EngineRuleId.RULE_PENALTY_LOW_COVERAGE_DEPENDENTS => new[] { args["penaltyPoints"].GetValue() },
            EngineRuleId.RULE_PENALTY_HIGH_DEBT => new[] { args["penaltyPoints"].GetValue() },
            EngineRuleId.RULE_PENALTY_NO_EMERGENCY_FUND => new[] { args["penaltyPoints"].GetValue() },
            EngineRuleId.RULE_EDUCATION_COSTS => new[] { args["amount"].GetValue() },
            EngineRuleId.RULE_ITCMD_ESTATE_TAX => new[] { args["estateValue"].GetValue(), args["rate"].GetValue(), args["state"].GetValue(), args["amount"].GetValue() },
            EngineRuleId.RULE_INVENTORY_COSTS => new[] { args["estateValue"].GetValue(), args["rate"].GetValue(), args["amount"].GetValue() },
            _ => Array.Empty<object>()
        };
    }
}
