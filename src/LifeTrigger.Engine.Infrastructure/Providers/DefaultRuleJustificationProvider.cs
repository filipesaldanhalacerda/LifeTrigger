using System.Collections.Generic;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Constants;

namespace LifeTrigger.Engine.Infrastructure.Providers;

public class DefaultRuleJustificationProvider : IRuleJustificationProvider
{
    private static readonly Dictionary<string, string> _ptBrTexts = new()
    {
        { EngineRules.IncomeReplacementNoDependents, "Substituição de renda baseada em {0} anos devido à ausência de dependentes." },
        { EngineRules.IncomeReplacementWithDependents, "Substituição de renda baseada em {0} anos para suprir necessidades de {1} dependente(s)." },
        { EngineRules.DebtClearanceFull, "Quitação integral de dívidas no valor de {0:C}." },
        { EngineRules.TransitionReserveWithFund, "Reserva de transição calculada em {0} meses considerando a reserva de emergência atual de {1} meses." },
        { EngineRules.TransitionReserveDefaultNoFund, "Reserva de transição padrão aplicada ({0} meses) devido à não informação de reserva de emergência." },
        { EngineRules.GuardrailMinCoverage, "A cobertura calculada foi ajustada para o limite mínimo de proteção vital ({0}x a renda anual)." },
        { EngineRules.GuardrailMaxCoverage, "A cobertura calculada foi limitada ao teto de proteção ({0}x a renda anual) para evitar sobreseguro." },
        { EngineRules.PenaltyLowCoverageDependents, "Penalidade de {0} pontos aplicada no score devido à baixa cobertura com dependentes." },
        { EngineRules.PenaltyHighDebt, "Penalidade de {0} pontos aplicada no score devido ao alto nível de endividamento (> 50% da renda anual)." },
        { EngineRules.PenaltyNoEmergencyFund, "Penalidade de {0} pontos aplicada no score devido à ausência de reserva de emergência mínima (3 meses)." },
        { EngineRules.ActionOverrideOldReview, "Ação alterada para REVISAR devido à última revisão ter ocorrido há mais de 12 meses." },
        { EngineRules.ActionOverrideUnconfirmedData, "Ação alterada para REVISAR devido à existência de dados essenciais não confirmados." },
        { EngineRules.ActionOverrideRecentTrigger, "Ação alterada para REVISAR devido à ocorrência de um gatilho de vida recente." }
    };

    public string GetJustification(string ruleConstant, params object[] formatArgs)
    {
        if (_ptBrTexts.TryGetValue(ruleConstant, out var template))
        {
            return string.Format(template, formatArgs);
        }

        return $"Regra {ruleConstant} aplicada.";
    }
}
