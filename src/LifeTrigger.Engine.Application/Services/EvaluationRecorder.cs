using System;
using System.Collections.Generic;
using System.Linq;
using LifeTrigger.Engine.Domain.Enums;
using LifeTrigger.Engine.Domain.ValueObjects;

namespace LifeTrigger.Engine.Application.Services;

/// <summary>
/// Gravador State-ful de regras. Usado EXCLUSIVAMENTE durante a execução ativa do `Calculate()`.
/// Após a geração do Snapshot Imutável, a instância entra em estado de `Congelamento` (Frozen),
/// disparando exceções determinísticas caso chamadas assíncronas clandestinas tentem injetar regras tardiamente.
/// </summary>
public class EvaluationRecorder
{
    private readonly List<EngineRuleId> _appliedRules = new();
    private readonly List<RuleJustification> _justifications = new();
    private bool _isFrozen;
    private bool _hasInsufficientInput;

    /// <summary>
    /// Adiciona uma regra estritamente tipada.
    /// Default: Permite duplicatas preservando a ordem cronológica da execução.
    /// </summary>
    public void TrackRule(RuleJustification justification)
    {
        if (_isFrozen)
            throw new InvalidOperationException($"CRITICAL AUDIT EXCEPTION: Attempted to inject rule '{justification.RuleId}' AFTER the Evaluation Recorder was frozen and snapshotted. This indicates a mutability leak.");

        if (justification.RuleId == EngineRuleId.RULE_INPUT_INSUFFICIENT_FOR_EVALUATION)
            _hasInsufficientInput = true;

        _appliedRules.Add(justification.RuleId);
        _justifications.Add(justification);
    }

    /// <summary>
    /// Congela permanentemente o Rastreador e gera o Snapshot imutável.
    /// </summary>
    /// <param name="deduplicate">Opcional: Se verdadeiro, remove regras duplicadas preservando apenas a primeira aparição na ordem cronológica.</param>
    public EvaluationSnapshot FreezeAndGenerateSnapshot(bool deduplicate = false)
    {
        _isFrozen = true;

        var finalRules = deduplicate ? _appliedRules.Distinct().ToList() : _appliedRules.ToList();

        return new EvaluationSnapshot
        {
            AppliedRuleIds = finalRules.Select(r => r.ToString()).ToList().AsReadOnly(),
            AppliedRules = finalRules.AsReadOnly(),
            Justifications = _justifications.AsReadOnly(),
            HasInsufficientInputBreak = _hasInsufficientInput
        };
    }
}
