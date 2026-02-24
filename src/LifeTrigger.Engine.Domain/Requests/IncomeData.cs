namespace LifeTrigger.Engine.Domain.Requests;

public record IncomeData(
    decimal? ExactValue,
    string? Bracket // Usado caso o exactValue seja nulo (Ex: "10K_15K")
);
