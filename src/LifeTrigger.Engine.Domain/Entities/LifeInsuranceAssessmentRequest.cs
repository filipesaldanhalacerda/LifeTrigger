namespace LifeTrigger.Engine.Domain.Entities;

using LifeTrigger.Engine.Domain.Requests;

/// <summary>
/// O payload centralizado para envio de perfil financeiro ao Motor LifeTrigger.
/// </summary>
/// <param name="PersonalContext">Dados demográficos que impactam a base do risco de vida (Idade, Risco Profissional, etc).</param>
/// <param name="FinancialContext">A espinha dorsal matemática (Renda, Dívidas Gaps de Reserva e Proteção).</param>
/// <param name="FamilyContext">Define a longevidade da cobertura de renda (Quantidade de dependentes suportados).</param>
/// <param name="OperationalData">Dados operacionais obrigatórios: Canal, TenantId e o mais importante, a Verificação de Consentimento LGPD explícito.</param>
public record LifeInsuranceAssessmentRequest(
    PersonalContext PersonalContext,
    FinancialContext FinancialContext,
    FamilyContext FamilyContext,
    OperationalData OperationalData
);
