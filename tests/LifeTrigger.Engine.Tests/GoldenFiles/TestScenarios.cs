using System;
using System.Collections.Generic;
using LifeTrigger.Engine.Domain.Entities;
using LifeTrigger.Engine.Domain.Enums;
using LifeTrigger.Engine.Domain.Requests;

namespace LifeTrigger.Engine.Tests.GoldenFiles;

public static class TestScenarios
{
    public static LifeInsuranceAssessmentRequest NoDependentsAvgIncomeNoDebt() => new(
        PersonalContext: new PersonalContext(30, MaritalStatus.SOLTEIRO, ProfessionRiskLevel.BAIXO, false),
        FamilyContext: new FamilyContext(0, Array.Empty<int>()),
        FinancialContext: new FinancialContext(
            new IncomeData(10000m, null), 
            6, 
            new DebtData(0m, 0), 
            null),
        OperationalData: new OperationalData(null, "APP", true, "consent-123")
    );

    public static LifeInsuranceAssessmentRequest OneDependentModerateDebt() => new(
        PersonalContext: new PersonalContext(35, MaritalStatus.CASADO, ProfessionRiskLevel.BAIXO, false),
        FamilyContext: new FamilyContext(1, new[] { 5 }),
        FinancialContext: new FinancialContext(
            new IncomeData(15000m, null), 
            6, 
            new DebtData(50000m, 24), 
            null),
        OperationalData: new OperationalData(null, "WEB", true, "consent-124")
    );
    
    public static LifeInsuranceAssessmentRequest TwoDependentsHighDebt() => new(
        PersonalContext: new PersonalContext(40, MaritalStatus.CASADO, ProfessionRiskLevel.MEDIO, false),
        FamilyContext: new FamilyContext(2, new[] { 10, 12 }),
        FinancialContext: new FinancialContext(
            new IncomeData(8000m, null), 
            1, 
            new DebtData(100000m, 60), 
            new CurrentInsuranceData(50000m, PolicyType.TEMPORARIO)),
        OperationalData: new OperationalData(null, "BROKER", true, "consent-125")
    );
    
    public static LifeInsuranceAssessmentRequest HighEmergencyFund() => new(
        PersonalContext: new PersonalContext(28, MaritalStatus.SOLTEIRO, ProfessionRiskLevel.BAIXO, false),
        FamilyContext: new FamilyContext(0, Array.Empty<int>()),
        FinancialContext: new FinancialContext(
            new IncomeData(12000m, null), 
            24, 
            new DebtData(0m, 0), 
            null), // 24 meses reduz buffer de transição
        OperationalData: new OperationalData(null, "APP", true, "consent-126")
    );
    
    public static LifeInsuranceAssessmentRequest NoEmergencyFund() => new(
        PersonalContext: new PersonalContext(45, MaritalStatus.DIVORCIADO, ProfessionRiskLevel.ALTO, true),
        FamilyContext: new FamilyContext(1, new[] { 16 }),
        FinancialContext: new FinancialContext(
            new IncomeData(5000m, null), 
            0, 
            new DebtData(20000m, 48), 
            new CurrentInsuranceData(10000m, PolicyType.VIDA_INTEIRA)), // 0 meses aciona buffer padrão + penalidade
        OperationalData: new OperationalData(null, "APP", true, "consent-127")
    );
    
    public static LifeInsuranceAssessmentRequest OverInsuredReduzir() => new(
        PersonalContext: new PersonalContext(50, MaritalStatus.CASADO, ProfessionRiskLevel.BAIXO, false),
        FamilyContext: new FamilyContext(0, Array.Empty<int>()),
        FinancialContext: new FinancialContext(
            new IncomeData(20000m, null), 
            12, 
            new DebtData(0m, 0), 
            new CurrentInsuranceData(5000000m, PolicyType.TEMPORARIO)), // Muita cobertura, recomenda REDUZIR
        OperationalData: new OperationalData(null, "WEB", true, "consent-128")
    );

    public static LifeInsuranceAssessmentRequest LowerGuardrail2x() => new(
        PersonalContext: new PersonalContext(25, MaritalStatus.SOLTEIRO, ProfessionRiskLevel.BAIXO, false),
        FamilyContext: new FamilyContext(0, Array.Empty<int>()),
        FinancialContext: new FinancialContext(
            new IncomeData(2000m, null), 
            6, 
            new DebtData(0m, 0), 
            null), // Calculo baixo forçará o piso de 2x anual (48k)
        OperationalData: new OperationalData(null, "APP", true, "consent-129")
    );
    
    public static LifeInsuranceAssessmentRequest NeedsReviewOver12Months() => new(
         PersonalContext: new PersonalContext(30, MaritalStatus.SOLTEIRO, ProfessionRiskLevel.BAIXO, false),
         FamilyContext: new FamilyContext(0, Array.Empty<int>()),
         FinancialContext: new FinancialContext(
             new IncomeData(10000m, null), 
             6, 
             new DebtData(0m, 0), 
             new CurrentInsuranceData(250000m, PolicyType.TEMPORARIO)),
         OperationalData: new OperationalData(DateTimeOffset.UtcNow.AddMonths(-13), "APP", true, "consent-130") // -> REVISAR
     );

    public static LifeInsuranceAssessmentRequest TriggerNasceuFilho() => new(
         PersonalContext: new PersonalContext(30, MaritalStatus.CASADO, ProfessionRiskLevel.BAIXO, false),
         FamilyContext: new FamilyContext(1, new[] { 0 }), // Acabou de nascer
         FinancialContext: new FinancialContext(
             new IncomeData(10000m, null), 6, new DebtData(0m, 0), null),
         OperationalData: new OperationalData(DateTimeOffset.UtcNow, "APP", true, "consent-131", null, false, true) // recentLifeTrigger = true
     );

    public static LifeInsuranceAssessmentRequest TriggerRendaSubiu() => new(
         PersonalContext: new PersonalContext(30, MaritalStatus.SOLTEIRO, ProfessionRiskLevel.BAIXO, false),
         FamilyContext: new FamilyContext(0, Array.Empty<int>()),
         FinancialContext: new FinancialContext(
             new IncomeData(15000m, null), // Renda subiu > 15%
             6, new DebtData(0m, 0), null),
         OperationalData: new OperationalData(DateTimeOffset.UtcNow, "APP", true, "consent-132", null, false, true)
     );

    public static LifeInsuranceAssessmentRequest TriggerFinanciamentoNovo() => new(
         PersonalContext: new PersonalContext(30, MaritalStatus.CASADO, ProfessionRiskLevel.BAIXO, false),
         FamilyContext: new FamilyContext(0, Array.Empty<int>()),
         FinancialContext: new FinancialContext(
             new IncomeData(10000m, null), 6, new DebtData(300000m, 120), null), // Nova dívida gigante
         OperationalData: new OperationalData(DateTimeOffset.UtcNow, "APP", true, "consent-133", null, false, true)
     );

    public static LifeInsuranceAssessmentRequest ZeroCurrentCoverage() => new(
         PersonalContext: new PersonalContext(30, MaritalStatus.SOLTEIRO, ProfessionRiskLevel.BAIXO, false),
         FamilyContext: new FamilyContext(0, Array.Empty<int>()),
         FinancialContext: new FinancialContext(
             new IncomeData(10000m, null), 6, new DebtData(0m, 0), null), // NULL indica sem cobertura
         OperationalData: new OperationalData(null, "APP", true, "consent-134")
     );

    public static LifeInsuranceAssessmentRequest UpperGuardrail20x() => new(
         PersonalContext: new PersonalContext(30, MaritalStatus.CASADO, ProfessionRiskLevel.ALTO, false),
         FamilyContext: new FamilyContext(5, new[] { 2, 4, 6, 8, 10 }), // Muito dependente (Estoura Base)
         FinancialContext: new FinancialContext(
             new IncomeData(5000m, null), 0, new DebtData(5000000m, 360), null), // Gigantesca dívida e zero fundo -> Teto engatilhado
         OperationalData: new OperationalData(null, "APP", true, "consent-135")
     );
}
