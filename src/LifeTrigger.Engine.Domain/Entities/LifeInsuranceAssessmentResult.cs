using System;
using System.Collections.Generic;
using LifeTrigger.Engine.Domain.Enums;
using LifeTrigger.Engine.Domain.ValueObjects;

namespace LifeTrigger.Engine.Domain.Entities;

public record LifeInsuranceAssessmentResult
{
    public decimal RecommendedCoverageAmount { get; init; }
    public decimal CurrentCoverageAmount { get; init; }
    
    public decimal ProtectionGapAmount => RecommendedCoverageAmount - CurrentCoverageAmount;
    
    public decimal ProtectionGapPercentage => RecommendedCoverageAmount > 0 
        ? (ProtectionGapAmount / RecommendedCoverageAmount) * 100 
        : 0;
        
    public int ProtectionScore { get; init; } // 0 - 100
    
    /// <summary>
    /// Mede a eficiência espacial da alocação de capital (o quão perto o seguro atual está da necessidade real, punindo capital ocioso no sobreseguro).
    /// </summary>
    public int CoverageEfficiencyScore { get; init; } // 0 - 100
    
    // Coverage Breakdown (composição da cobertura recomendada)
    public decimal IncomeReplacementAmount { get; init; }
    public decimal DebtClearanceAmount { get; init; }
    public decimal TransitionReserveAmount { get; init; }
    public decimal EducationCostsAmount { get; init; }
    public decimal ItcmdCostAmount { get; init; }
    public decimal InventoryCostAmount { get; init; }

    public RiskClassification RiskClassification { get; init; }
    public CoverageStatus CoverageStatus { get; init; }
    public RecommendedAction RecommendedAction { get; init; }
    
    public IReadOnlyCollection<string> RegrasAplicadas { get; init; } = Array.Empty<string>();
    
    /// <summary>
    /// Árvore Estruturada de Justificativas (TemplateId + Args Primitivos) desenhada para Golden Files e integrações B2B rígidas.
    /// </summary>
    public IReadOnlyCollection<RuleJustification> JustificationsStructured { get; init; } = Array.Empty<RuleJustification>();
    
    /// <summary>
    /// Textos legíveis e traduzidos formatados pelo Renderer de Apresentação (ex: pt-BR).
    /// </summary>
    public IReadOnlyCollection<string> JustificationsRendered { get; init; } = Array.Empty<string>();

    /// <summary>
    /// Personalized broker insights generated from the evaluation result and the client's full
    /// profile. Five insights ordered by category: ABERTURA → ARGUMENTO_PRINCIPAL →
    /// OBJECAO_PREVISTA → PRODUTO_SUGERIDO → PROXIMO_PASSO.
    /// </summary>
    public IReadOnlyList<BrokerInsight> BrokerInsights { get; init; } = Array.Empty<BrokerInsight>();

    public AuditMetadata Audit { get; init; } = null!;
}
