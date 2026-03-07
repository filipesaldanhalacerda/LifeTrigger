namespace LifeTrigger.Engine.Domain.Requests;

public record FinancialContext(
    IncomeData MonthlyIncome,
    int? EmergencyFundMonths,
    DebtData? Debts,
    CurrentInsuranceData? CurrentLifeInsurance,
    EducationData? EducationCosts = null,
    EstateData? Estate = null
);
