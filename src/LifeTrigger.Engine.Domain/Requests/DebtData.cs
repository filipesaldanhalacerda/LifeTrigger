namespace LifeTrigger.Engine.Domain.Requests;

public record DebtData(
    decimal TotalAmount,
    int? RemainingTermMonths
);
