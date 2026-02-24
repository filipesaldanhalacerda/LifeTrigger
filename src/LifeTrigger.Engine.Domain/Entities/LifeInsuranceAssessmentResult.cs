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
    public RiskClassification RiskClassification { get; init; }
    public RecommendedAction RecommendedAction { get; init; }
    
    public IReadOnlyCollection<string> RegrasAplicadas { get; init; } = Array.Empty<string>();
    public IReadOnlyCollection<string> Justificativas { get; init; } = Array.Empty<string>();
    public AuditMetadata Audit { get; init; } = null!;
}
