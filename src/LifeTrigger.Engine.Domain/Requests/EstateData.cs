namespace LifeTrigger.Engine.Domain.Requests;

/// <summary>
/// Dados patrimoniais para cálculo de custos sucessórios (ITCMD + inventário).
/// </summary>
public record EstateData(
    decimal TotalEstateValue,
    string? State
);
