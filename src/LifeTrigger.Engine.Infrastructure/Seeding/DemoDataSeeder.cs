using System;
using System.Collections.Generic;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Entities;
using LifeTrigger.Engine.Domain.Requests;
using LifeTrigger.Engine.Domain.Enums;

namespace LifeTrigger.Engine.Infrastructure.Seeding;

public static class DemoDataSeeder
{
    public static async void SeedDemoTenants(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IEvaluationRepository>();
        var calculator = scope.ServiceProvider.GetRequiredService<ILifeInsuranceCalculator>();

        // We use explicit known GUIDs for the Demo Tenants to ensure front-end plug-and-play config works out of the box
        var alphaTenantId = Guid.Parse("A1A1A1A1-A1A1-A1A1-A1A1-A1A1A1A1A1A1"); // DEMO_CORRETORA_ALPHA
        var betaTenantId = Guid.Parse("B2B2B2B2-B2B2-B2B2-B2B2-B2B2B2B2B2B2");   // DEMO_EMPRESA_BETA

        // Seed: 1. AUMENTAR (High gap, 2 dependents, low coverage)
        var aumentarReq = CreateRequest(
            age: 35, income: 15000, dependents: 2, coverage: 50000, debt: 100000, 
            tenantId: alphaTenantId, "DEMO_CORRETORA_ALPHA"
        );
        await SeedEvaluation(repository, calculator, aumentarReq);

        // Seed: 2. MANTER (Adequate coverage, no debt, good reserve)
        var manterReq = CreateRequest(
            age: 30, income: 10000, dependents: 0, coverage: 500000, debt: 0, 
            tenantId: alphaTenantId, "DEMO_CORRETORA_ALPHA"
        );
        await SeedEvaluation(repository, calculator, manterReq);

        // Seed: 3. REDUZIR (Over-insured, no dependents)
        var reduzirReq = CreateRequest(
            age: 28, income: 5000, dependents: 0, coverage: 1500000, debt: 0, 
            tenantId: betaTenantId, "DEMO_EMPRESA_BETA"
        );
        await SeedEvaluation(repository, calculator, reduzirReq);

        // Seed: 4. REVISAR (Stale review data > 12 months)
        var revisarReq = CreateRequest(
            age: 40, income: 20000, dependents: 1, coverage: 1000000, debt: 50000, 
            tenantId: betaTenantId, "DEMO_EMPRESA_BETA", lastReviewMonthsAgo: 14
        );
        await SeedEvaluation(repository, calculator, revisarReq);
    }

    private static LifeInsuranceAssessmentRequest CreateRequest(
        int age, decimal income, int dependents, decimal coverage, decimal debt, 
        Guid tenantId, string tenantName, int lastReviewMonthsAgo = 0)
    {
        return new LifeInsuranceAssessmentRequest(
            PersonalContext: new PersonalContext(Age: age, MaritalStatus: MaritalStatus.SOLTEIRO, ProfessionRiskLevel: ProfessionRiskLevel.BAIXO, IsSmoker: false),
            FinancialContext: new FinancialContext(
                MonthlyIncome: new IncomeData(income, null),
                CurrentLifeInsurance: new CurrentInsuranceData(coverage, null),
                Debts: new DebtData(debt, 60),
                EmergencyFundMonths: 6
            ),
            FamilyContext: new FamilyContext(DependentsCount: dependents, DependentsAges: Array.Empty<int>()),
            OperationalData: new OperationalData(
                OriginChannel: "DEMO_SEEDER",
                HasExplicitActiveConsent: true,
                ConsentId: "demo-consent-999",
                HasUnconfirmedData: false,
                RecentLifeTrigger: false,
                LastReviewDate: lastReviewMonthsAgo > 0 ? DateTimeOffset.UtcNow.AddMonths(-lastReviewMonthsAgo) : null,
                TenantId: tenantId
            )
        );
    }

    private static async System.Threading.Tasks.Task SeedEvaluation(
        IEvaluationRepository repository, ILifeInsuranceCalculator calculator, LifeInsuranceAssessmentRequest request)
    {
        var result = calculator.Calculate(request);
        var record = new EvaluationRecord(
            Id: Guid.NewGuid(),
            Timestamp: DateTimeOffset.UtcNow,
            EngineVersion: "1.0.0",
            RuleSetVersion: "2026.02-DEMO",
            Request: request,
            Result: result
        );
        await repository.SaveAsync(record);
    }
}
