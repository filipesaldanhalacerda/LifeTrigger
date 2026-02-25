using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using FluentValidation;
using FluentValidation.Results;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Entities;
using LifeTrigger.Engine.Domain.Requests;
using LifeTrigger.Engine.Api.Filters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;

namespace LifeTrigger.Engine.Api.Controllers;

/// <summary>
/// Trata das rotas universais de submissão do Core de Gatilhos e Motor Matemático.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
[EnableRateLimiting("evaluation")]
public class EvaluationsController : ControllerBase
{
    private readonly ILifeInsuranceCalculator _calculator;
    private readonly IValidator<LifeInsuranceAssessmentRequest> _validator;
    private readonly IEvaluationRepository _repository;
    private readonly IAuditLoggerService _auditLogger;
    private readonly ITenantSettingsRepository _tenantSettingsRepository;
    private readonly IRuleJustificationRenderer _justificationRenderer;
    private readonly IEngineContext _engineContext;

    public EvaluationsController(
        ILifeInsuranceCalculator calculator,
        IValidator<LifeInsuranceAssessmentRequest> validator,
        IEvaluationRepository repository,
        IAuditLoggerService auditLogger,
        ITenantSettingsRepository tenantSettingsRepository,
        IRuleJustificationRenderer justificationRenderer,
        IEngineContext engineContext)
    {
        _calculator = calculator;
        _validator = validator;
        _repository = repository;
        _auditLogger = auditLogger;
        _tenantSettingsRepository = tenantSettingsRepository;
        _justificationRenderer = justificationRenderer;
        _engineContext = engineContext;
    }

    /// <summary>
    /// Calcula o Gap de Proteção e Recomendações de Ação.
    /// </summary>
    /// <remarks>
    /// O motor usa Renda, Dívidas e Dependentes para gerar matematicamente um diagnóstico inquestionável e imutável.
    /// Exige um Cabeçalho (Header) Idempotency-Key para prevenir ataques ou reenvios duplos.
    /// </remarks>
    /// <param name="request">Payload contendo os dados Pessoais, Financeiros e Familiares.</param>
    /// <returns>Resultado analítico detalhado do risco e ações a tomar.</returns>
    [HttpPost]
    [TypeFilter(typeof(IdempotencyFilterAttribute))]
    [ProducesResponseType(typeof(LifeInsuranceAssessmentResult), 200)]
    [ProducesResponseType(typeof(object), 400)]
    public async Task<IActionResult> Evaluate([FromBody] LifeInsuranceAssessmentRequest request, CancellationToken cancellationToken)
    {
        ValidationResult validationResult = await _validator.ValidateAsync(request, cancellationToken);

        if (!validationResult.IsValid)
        {
            var consentError = validationResult.Errors.FirstOrDefault(e => e.PropertyName.Contains("HasExplicitActiveConsent") || e.PropertyName.Contains("ConsentId"));
            if (consentError != null)
            {
                return UnprocessableEntity(new
                {
                    ErrorCode = "CONSENT_REQUIRED",
                    Message = consentError.ErrorMessage,
                    Details = Array.Empty<object>()
                });
            }

            var errors = validationResult.Errors.Select(e => new { Field = e.PropertyName, Error = e.ErrorMessage });
            return BadRequest(new { Message = "Validation Failed", Errors = errors });
        }

        var tenantSettings = request.OperationalData.TenantId.HasValue
            ? await _tenantSettingsRepository.GetByTenantIdAsync(request.OperationalData.TenantId.Value, cancellationToken)
            : null;

        var result = _calculator.Calculate(request, tenantSettings);

        var renderedResult = result with
        {
            JustificationsRendered = result.JustificationsStructured
                .Select(j => _justificationRenderer.Render(j))
                .ToList()
                .AsReadOnly()
        };

        var record = new EvaluationRecord(
            Id: Guid.NewGuid(),
            Timestamp: DateTimeOffset.UtcNow,
            EngineVersion: _engineContext.EngineVersion,
            RuleSetVersion: _engineContext.RuleSetVersion,
            Request: request,
            Result: renderedResult
        );

        record = record with { AuditHash = _auditLogger.CalculateAuditHash(record) };

        await _repository.SaveAsync(record, cancellationToken);

        _auditLogger.LogEvaluationCompleted(record);

        Response.Headers.Append("X-Evaluation-Id", record.Id.ToString());

        return Ok(renderedResult);
    }

    /// <summary>
    /// Resgata o histórico detalhado de uma Avaliação gerada no passado.
    /// </summary>
    /// <param name="id">ID (X-Evaluation-Id) da avaliação recebido no POST original.</param>
    /// <returns>Objeto contendo o Ponto no Tempo (Input original e Result gerado).</returns>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(EvaluationRecord), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetEvaluation(Guid id, CancellationToken cancellationToken)
    {
        var record = await _repository.GetByIdAsync(id, cancellationToken);

        if (record == null)
            return NotFound(new { Message = "Avaliação não encontrada." });

        return Ok(record);
    }

    /// <summary>
    /// Endpoint Administrativo: Verifica a Integridade Criptográfica (Auditoria).
    /// </summary>
    /// <remarks>
    /// Recalcula dinamicamente a cadeia de input e regra, confrontando Hash256 para prevenir edição forçada em Banco de Dados.
    /// </remarks>
    /// <param name="id">O ID da avaliação a ser periciada.</param>
    /// <returns>PASS ou FAIL denotando integridade inquebrável.</returns>
    [HttpGet("/api/v1/admin/audit/evaluations/{id}/verify")]
    [ProducesResponseType(typeof(object), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> VerifyEvaluationIntegrity(Guid id, CancellationToken cancellationToken)
    {
        var record = await _repository.GetByIdAsync(id, cancellationToken);

        if (record == null)
            return NotFound(new { Message = "Avaliação não encontrada para verificação de integridade." });

        var storedHash = record.AuditHash;

        if (storedHash == null)
            return Ok(new { Id = record.Id, Status = "UNAVAILABLE", Message = "Esta avaliação foi gerada antes da implementação do AuditHash." });

        var computedHash = _auditLogger.CalculateAuditHash(record);
        var status = computedHash == storedHash ? "PASS" : "FAIL";

        return Ok(new
        {
            Id = record.Id,
            Status = status,
            StoredHash = storedHash,
            ComputedHash = computedHash
        });
    }

    /// <summary>
    /// Endpoint Administrativo: Limpa os Locatários Demonstrativos (Demo).
    /// </summary>
    /// <remarks>
    /// Protegido estritamente para não apagar Tenants reais de produção.
    /// </remarks>
    /// <param name="tenantId">UUID do ambiente Demo a ser deletado.</param>
    /// <returns>Quantidade de registros apagados.</returns>
    [HttpDelete("/api/v1/admin/demo-environments/tenants/{tenantId}")]
    [ProducesResponseType(typeof(object), 200)]
    public async Task<IActionResult> CleanDemoTenant(Guid tenantId, CancellationToken cancellationToken)
    {
        var alphaTenantId = Guid.Parse("A1A1A1A1-A1A1-A1A1-A1A1-A1A1A1A1A1A1");
        var betaTenantId = Guid.Parse("B2B2B2B2-B2B2-B2B2-B2B2-B2B2B2B2B2B2");

        if (tenantId != alphaTenantId && tenantId != betaTenantId)
        {
            return BadRequest(new { Message = "Este tenant não está marcado como ambiente de demonstração e não pode ser limpo através desta rota." });
        }

        var deletedCount = await _repository.CleanTenantAsync(tenantId, cancellationToken);

        return Ok(new
        {
            Status = "SUCCESS",
            Message = $"Ambiente Demo {tenantId} limpo com sucesso.",
            RecordsRemoved = deletedCount
        });
    }

    /// <summary>
    /// Endpoint de Telemetria: Retorna Análise Agregada do Piloto (Dashboard C-Level).
    /// </summary>
    /// <remarks>
    /// Gera distribuições de Risco (CRITICO/ADEQUADO) isoladas por Tenant, sem expor PII.
    /// </remarks>
    /// <param name="tenantId">ID do Tenant de Isolamento Comercial.</param>
    /// <param name="startDate">Data Inicial Opcional.</param>
    /// <param name="endDate">Data Final Opcional.</param>
    /// <param name="limit">Limite de registros por página (padrão: 500, máximo: 1000).</param>
    /// <param name="offset">Deslocamento para paginação (padrão: 0).</param>
    /// <returns>Grupos Agregados de Venda (AUMENTAR/MANTER)</returns>
    [HttpGet("/api/v1/admin/reports/pilot")]
    [ProducesResponseType(typeof(object), 200)]
    public async Task<IActionResult> GetPilotReport(
        [FromQuery] Guid tenantId,
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int limit = 500,
        [FromQuery] int offset = 0,
        CancellationToken cancellationToken = default)
    {
        if (limit < 1 || limit > 1000)
            return BadRequest(new { Message = "O parâmetro 'limit' deve estar entre 1 e 1000." });

        if (offset < 0)
            return BadRequest(new { Message = "O parâmetro 'offset' deve ser maior ou igual a zero." });

        var evaluations = await _repository.GetByFilterAsync(tenantId, startDate, endDate, limit, offset, cancellationToken);

        var total = evaluations.Count();
        if (total == 0)
        {
            return Ok(new { TotalEvaluations = 0, Message = "Nenhum dado encontrado para os filtros informados." });
        }

        var riskDistribution = evaluations
            .GroupBy(e => e.Result.RiskClassification.ToString())
            .ToDictionary(g => g.Key, g => g.Count());

        var actionDistribution = evaluations
            .GroupBy(e => e.Result.RecommendedAction.ToString())
            .ToDictionary(g => g.Key, g => g.Count());

        var triggerCount = evaluations.Count(e => e.Request.OperationalData.RecentLifeTrigger);

        return Ok(new
        {
            TenantId = tenantId,
            Period = new { Start = startDate, End = endDate },
            Pagination = new { Limit = limit, Offset = offset, ReturnedCount = total },
            Metrics = new
            {
                RiskDistribution = riskDistribution,
                ActionDistribution = actionDistribution,
                EvaluationsWithRecentLifeTrigger = triggerCount
            }
        });
    }
}
