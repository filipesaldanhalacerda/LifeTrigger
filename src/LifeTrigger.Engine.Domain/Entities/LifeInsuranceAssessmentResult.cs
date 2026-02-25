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
    
    public AuditMetadata Audit { get; init; } = null!;
}
