using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using LifeTrigger.Engine.Domain.Enums;

namespace LifeTrigger.Engine.Domain.ValueObjects;

/// <summary>
/// Representa uma justificativa estruturada, imutável e 100% determinística.
/// Desenvolvida para Auditabilidade Estrita e renderização desacoplada (i18n).
/// </summary>
public record RuleJustification
{
    public EngineRuleId RuleId { get; init; }

    /// <summary>
    /// Chave fixa de estabilidade técnica/versão (Ex: "RULE_INCOME_REPLACEMENT_WITH_DEPENDENTS_V1").
    /// </summary>
    public string TemplateId { get; init; }

    /// <summary>
    /// Chave oficial de localização/i18n (Ex: "rules.income_replacement_with_dependents").
    /// </summary>
    public string MessageKey { get; init; }

    /// <summary>
    /// Dicionário estritamente ordenado alfabeticamente contendo tipos primitivos empacotados em RuleArgValue.
    /// Garante serialização estritamente determinística e Golden Hashes exatos.
    /// </summary>
    public IReadOnlyDictionary<string, RuleArgValue> Args { get; init; }

    /// <summary>
    /// Texto opcional renderizado. No núcleo de cálculo, deve permanecer nulo.
    /// Preenchido apenas na camada de interface/Apresentação via IRuleJustificationRenderer.
    /// </summary>
    public string? RenderedText { get; init; }

    /// <summary>
    /// Construtor restrito para forçar a ordenação alfabética das chaves e barrar tipos proibidos através do RuleArgValue.
    /// </summary>
    public RuleJustification(EngineRuleId ruleId, string templateId, string messageKey, IDictionary<string, RuleArgValue> args)
    {
        RuleId     = ruleId;
        TemplateId = templateId ?? throw new ArgumentNullException(nameof(templateId));
        MessageKey = messageKey ?? throw new ArgumentNullException(nameof(messageKey));

        // SortedDictionary automatically guarantees alphabetical key enumeration and Serialization determinism.
        Args = new System.Collections.ObjectModel.ReadOnlyDictionary<string, RuleArgValue>(
            new SortedDictionary<string, RuleArgValue>(args ?? new Dictionary<string, RuleArgValue>())
        );
    }

    /// <summary>
    /// Construtor exclusivo para desserialização JSON.
    /// O parâmetro Args usa IReadOnlyDictionary para corresponder exatamente ao tipo da propriedade,
    /// resolvendo o erro de binding do System.Text.Json no .NET 9.
    /// </summary>
    [JsonConstructor]
    private RuleJustification(EngineRuleId ruleId, string templateId, string messageKey, IReadOnlyDictionary<string, RuleArgValue> args)
    {
        RuleId     = ruleId;
        TemplateId = templateId;
        MessageKey = messageKey;

        var sorted = new SortedDictionary<string, RuleArgValue>();
        if (args != null)
            foreach (var kv in args)
                sorted[kv.Key] = kv.Value;

        Args = new System.Collections.ObjectModel.ReadOnlyDictionary<string, RuleArgValue>(sorted);
    }
}
