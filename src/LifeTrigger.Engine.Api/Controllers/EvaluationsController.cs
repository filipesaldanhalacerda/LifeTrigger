using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using FluentValidation;
using FluentValidation.Results;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Entities;
using LifeTrigger.Engine.Domain.Enums;
using LifeTrigger.Engine.Domain.Requests;
using EvalStatus = LifeTrigger.Engine.Domain.Enums.EvaluationStatus;
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
    private readonly IBrokerInsightGenerator _insightGenerator;

    public EvaluationsController(
        ILifeInsuranceCalculator calculator,
        IValidator<LifeInsuranceAssessmentRequest> validator,
        IEvaluationRepository repository,
        IAuditLoggerService auditLogger,
        ITenantSettingsRepository tenantSettingsRepository,
        IRuleJustificationRenderer justificationRenderer,
        IEngineContext engineContext,
        IBrokerInsightGenerator insightGenerator)
    {
        _calculator = calculator;
        _validator = validator;
        _repository = repository;
        _auditLogger = auditLogger;
        _tenantSettingsRepository = tenantSettingsRepository;
        _justificationRenderer = justificationRenderer;
        _engineContext = engineContext;
        _insightGenerator = insightGenerator;
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
    [Authorize(Policy = "Broker")]
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

        // Enforce tenantId from JWT — prevents callers from spoofing a different tenant
        var jwtTenantId = GetTenantIdFromJwt();
        if (jwtTenantId.HasValue)
        {
            request = request with
            {
                OperationalData = request.OperationalData with { TenantId = jwtTenantId }
            };
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

        // Capture the authenticated user's ID for ownership tracking
        var callerUserId = GetUserIdFromJwt();

        var record = new EvaluationRecord(
            Id: Guid.NewGuid(),
            Timestamp: DateTimeOffset.UtcNow,
            EngineVersion: _engineContext.EngineVersion,
            RuleSetVersion: _engineContext.RuleSetVersion,
            Request: request,
            Result: renderedResult,
            CreatedByUserId: callerUserId
        );

        record = record with { AuditHash = _auditLogger.CalculateAuditHash(record) };

        await _repository.SaveAsync(record, cancellationToken);

        _auditLogger.LogEvaluationCompleted(record);

        Response.Headers.Append("X-Evaluation-Id", record.Id.ToString());

        return Ok(renderedResult);
    }

    /// <summary>
    /// Lista avaliações do tenant com paginação e filtros opcionais.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(object), 200)]
    public async Task<IActionResult> ListEvaluations(
        [FromQuery] Guid? tenantId,
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0,
        CancellationToken cancellationToken = default)
    {
        if (limit < 1 || limit > 1000)
            return BadRequest(new { Message = "O parâmetro 'limit' deve estar entre 1 e 1000." });

        // JWT tenantId overrides query param for non-SuperAdmin
        var jwtTenantId     = GetTenantIdFromJwt();
        var effectiveTenant = jwtTenantId ?? tenantId;

        if (effectiveTenant is null)
            return BadRequest(new { Message = "tenantId é obrigatório para SuperAdmin." });

        // Broker role: restrict list to their own evaluations only
        var callerRole    = GetRoleFromJwt();
        var ownershipFilter = callerRole == "Broker" ? GetUserIdFromJwt() : (Guid?)null;

        var evaluations = await _repository.GetByFilterAsync(
            effectiveTenant.Value, startDate, endDate, limit, offset,
            createdByUserId: ownershipFilter, cancellationToken);

        var items = evaluations.Select(e => new
        {
            id               = e.Id,
            timestamp        = e.Timestamp,
            action           = e.Result.RecommendedAction.ToString(),
            risk             = e.Result.RiskClassification.ToString(),
            score            = e.Result.CoverageEfficiencyScore,
            gapPct           = e.Result.ProtectionGapPercentage,
            channel          = e.Request.OperationalData.OriginChannel,
            createdByUserId  = e.CreatedByUserId,
            consentId        = e.Request.OperationalData.ConsentId,
            isTrigger        = e.Request.OperationalData.RecentLifeTrigger,
            status           = e.Status.ToString(),
        }).ToList();

        return Ok(new { total = items.Count, items });
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

        // Regenerate broker insights on-the-fly for evaluations stored before the feature existed.
        if (record.Result.BrokerInsights.Count == 0)
        {
            var insights = _insightGenerator.Generate(record.Result, record.Request);
            record = record with
            {
                Result = record.Result with { BrokerInsights = insights }
            };
        }

        // Recalculate efficiency score for records stored with the symmetric-scoring bug
        // (bug returned 100 for any current <= recommended, including zero coverage).
        if (record.Result.CoverageEfficiencyScore == 100 &&
            record.Result.CurrentCoverageAmount < record.Result.RecommendedCoverageAmount)
        {
            record = record with
            {
                Result = record.Result with
                {
                    CoverageEfficiencyScore = RecalculateEfficiencyScore(
                        record.Result.CurrentCoverageAmount,
                        record.Result.RecommendedCoverageAmount)
                }
            };
        }

        return Ok(record);
    }

    /// <summary>
    /// Atualiza o status do ciclo de vida de uma avaliação (ABERTO, CONVERTIDO, ARQUIVADO).
    /// </summary>
    [HttpPatch("{id}/status")]
    [Authorize(Policy = "Broker")]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdateEvaluationStatus(Guid id, [FromBody] UpdateStatusRequest body, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<EvalStatus>(body.Status, ignoreCase: true, out var newStatus))
            return BadRequest(new { Message = $"Status inválido: '{body.Status}'. Valores aceitos: ABERTO, CONVERTIDO, ARQUIVADO." });

        var updated = await _repository.UpdateStatusAsync(id, newStatus, cancellationToken);
        if (!updated)
            return NotFound(new { Message = "Avaliação não encontrada." });

        return NoContent();
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
    [Authorize(Policy = "Manager")]
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
    [Authorize(Policy = "SuperAdmin")]
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
    [Authorize(Policy = "Manager")]
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

        var evaluations = (await _repository.GetByFilterAsync(tenantId, startDate, endDate, limit, offset, cancellationToken: cancellationToken)).ToList();

        var total = evaluations.Count;
        if (total == 0)
        {
            return Ok(new
            {
                totalEvaluations   = 0,
                riskDistribution   = new { critico = 0, moderado = 0, adequado = 0 },
                actionDistribution = new { aumentar = 0, manter = 0, reduzir = 0, revisar = 0 },
                triggerCount       = 0,
            });
        }

        // Only count ABERTO evaluations for risk/action distributions (dashboard health)
        var active = evaluations.Where(e => e.Status == EvalStatus.ABERTO).ToList();
        var riskDist     = active.GroupBy(e => e.Result.RiskClassification).ToDictionary(g => g.Key, g => g.Count());
        var actionDist   = active.GroupBy(e => e.Result.RecommendedAction).ToDictionary(g => g.Key, g => g.Count());
        var triggerCount = evaluations.Count(e => e.Request?.OperationalData?.RecentLifeTrigger == true);

        return Ok(new
        {
            totalEvaluations = active.Count,
            totalAll = total,
            riskDistribution = new
            {
                critico  = riskDist.GetValueOrDefault(RiskClassification.CRITICO,  0),
                moderado = riskDist.GetValueOrDefault(RiskClassification.MODERADO, 0),
                adequado = riskDist.GetValueOrDefault(RiskClassification.ADEQUADO, 0),
            },
            actionDistribution = new
            {
                aumentar = actionDist.GetValueOrDefault(RecommendedAction.AUMENTAR, 0),
                manter   = actionDist.GetValueOrDefault(RecommendedAction.MANTER,   0),
                reduzir  = actionDist.GetValueOrDefault(RecommendedAction.REDUZIR,  0),
                revisar  = actionDist.GetValueOrDefault(RecommendedAction.REVISAR,  0),
            },
            triggerCount,
        });
    }

    private Guid? GetTenantIdFromJwt()
    {
        var value = User.FindFirstValue("tenantId");
        return Guid.TryParse(value, out var id) ? id : null;
    }

    private Guid? GetUserIdFromJwt()
    {
        var value = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)
                 ?? User.FindFirstValue("sub");
        return Guid.TryParse(value, out var id) ? id : null;
    }

    private string? GetRoleFromJwt() => User.FindFirstValue("role");

    private static int RecalculateEfficiencyScore(decimal currentCoverage, decimal recommendedCoverage)
    {
        if (recommendedCoverage <= 0) return 0;
        var ratio = currentCoverage / recommendedCoverage;
        decimal efficiency = ratio <= 1m
            ? ratio * 100m
            : 100m - ((ratio - 1m) * 100m);
        return (int)Math.Clamp(Math.Round(efficiency), 0, 100);
    }
}

public record UpdateStatusRequest(string Status);
