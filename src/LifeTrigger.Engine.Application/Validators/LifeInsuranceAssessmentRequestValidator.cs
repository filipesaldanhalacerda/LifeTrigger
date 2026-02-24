using FluentValidation;
using LifeTrigger.Engine.Domain.Entities;

namespace LifeTrigger.Engine.Application.Validators;

public class LifeInsuranceAssessmentRequestValidator : AbstractValidator<LifeInsuranceAssessmentRequest>
{
    public LifeInsuranceAssessmentRequestValidator()
    {
        RuleFor(x => x.OperationalData).NotNull().WithMessage("OperationalData é obrigatório.");
        When(x => x.OperationalData != null, () =>
        {
            RuleFor(x => x.OperationalData.HasExplicitActiveConsent)
                .Equal(true)
                .WithMessage("O consentimento ativo explícito é obrigatório para processar a avaliação.");
            
            RuleFor(x => x.OperationalData.ConsentId)
                .NotEmpty()
                .WithMessage("O identificador de consentimento (ConsentId) é obrigatório.");
        });

        RuleFor(x => x.PersonalContext).NotNull();
        When(x => x.PersonalContext != null, () =>
        {
            RuleFor(x => x.PersonalContext.Age)
                .GreaterThanOrEqualTo(18)
                .WithMessage("O proponente deve ter 18 anos ou mais.");
        });

        RuleFor(x => x.FinancialContext).NotNull();
        When(x => x.FinancialContext != null, () =>
        {
            RuleFor(x => x.FinancialContext.MonthlyIncome).NotNull();
            When(x => x.FinancialContext.MonthlyIncome != null, () =>
            {
                RuleFor(x => x.FinancialContext.MonthlyIncome.ExactValue)
                    .GreaterThanOrEqualTo(0)
                    .When(x => x.FinancialContext.MonthlyIncome.ExactValue.HasValue)
                    .WithMessage("A renda mensal não pode ser negativa.");
            });
            
            RuleFor(x => x.FinancialContext.EmergencyFundMonths)
                .GreaterThanOrEqualTo(0)
                .When(x => x.FinancialContext.EmergencyFundMonths.HasValue)
                .WithMessage("Os meses de reserva de emergência não podem ser negativos.");
                
            When(x => x.FinancialContext.Debts != null, () =>
            {
                RuleFor(x => x.FinancialContext.Debts!.TotalAmount)
                    .GreaterThanOrEqualTo(0)
                    .WithMessage("O valor total da dívida não pode ser negativo.");
            });
            
            When(x => x.FinancialContext.CurrentLifeInsurance != null, () =>
            {
                RuleFor(x => x.FinancialContext.CurrentLifeInsurance!.CoverageAmount)
                    .GreaterThanOrEqualTo(0)
                    .WithMessage("O valor da cobertura atual não pode ser negativo.");
            });
        });

        RuleFor(x => x.FamilyContext).NotNull();
        When(x => x.FamilyContext != null, () =>
        {
            RuleFor(x => x.FamilyContext.DependentsCount)
                .GreaterThanOrEqualTo(0)
                .WithMessage("O número de dependentes não pode ser negativo.");
        });
    }
}
