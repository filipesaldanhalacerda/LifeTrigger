using System;

namespace LifeTrigger.Engine.Domain.Entities;

/// <summary>
/// Mantém as parametrizações comerciais e pesos matemáticos específicos de uma Corretora.
/// Isso permite que o Engine seja White-Label na matemática sem perda de determinismo.
/// </summary>
public class TenantSettings
{
    public Guid TenantId { get; set; }
    
    // Substituição de Renda (Income Replacement)
    public int IncomeReplacementYearsSingle { get; set; } = 2;
    public int IncomeReplacementYearsWithDependents { get; set; } = 5;
    
    // Reserva e Gaps
    public int EmergencyFundBufferMonths { get; set; } = 6;
    
    // Guardrails de Venda
    public decimal MaxTotalCoverageMultiplier { get; set; } = 20.0m;
    public decimal MinCoverageAnnualIncomeMultiplier { get; set; } = 2.0m;

    // Sucessão / Inventário
    public decimal InventoryRate { get; set; } = 0.10m;

    // Teto absoluto de anos de reposição de renda
    public int MaxIncomeReplacementYears { get; set; } = 10;
}
