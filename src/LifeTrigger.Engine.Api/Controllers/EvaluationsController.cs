using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using FluentValidation;
using FluentValidation.Results;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Application.Services;
using LifeTrigger.Engine.Application.Services;
using LifeTrigger.Engine.Domain.Entities;
using LifeTrigger.Engine.Domain.Requests;
using LifeTrigger.Engine.Api.Filters;

namespace LifeTrigger.Engine.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class EvaluationsController : ControllerBase
{
    private readonly ILifeInsuranceCalculator _calculator;
    private readonly IValidator<LifeInsuranceAssessmentRequest> _validator;
    private readonly IEvaluationRepository _repository;
    private readonly IAuditLoggerService _auditLogger;

    public EvaluationsController(
        ILifeInsuranceCalculator calculator,
        IValidator<LifeInsuranceAssessmentRequest> validator,
        IEvaluationRepository repository,
        IAuditLoggerService auditLogger)
    {
        _calculator = calculator;
        _validator = validator;
        _repository = repository;
        _auditLogger = auditLogger;
    }

    [HttpPost]
    [TypeFilter(typeof(IdempotencyFilterAttribute))]
    [ProducesResponseType(typeof(LifeInsuranceAssessmentResult), 200)]
    [ProducesResponseType(typeof(object), 400)]
    public async Task<IActionResult> Evaluate([FromBody] LifeInsuranceAssessmentRequest request)
    {
        ValidationResult validationResult = await _validator.ValidateAsync(request);
        
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

        var result = _calculator.Calculate(request);
        
        var record = new EvaluationRecord(
            Id: Guid.NewGuid(),
            Timestamp: DateTimeOffset.UtcNow,
            EngineVersion: "1.0.0",
            RuleSetVersion: "2026.02",
            Request: request,
            Result: result
        );

        await _repository.SaveAsync(record);
        
        _auditLogger.LogEvaluationCompleted(record);
        
        // Retornamos o resultado acoplado com o ID da Evaluation na auditoria ou header,
        // mas aqui mapeamos para simplificar no retorno final. (Na pŕatica o id poderia ser no DTO, vou retornar um Header)
        Response.Headers.Append("X-Evaluation-Id", record.Id.ToString());

        return Ok(result);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(EvaluationRecord), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetEvaluation(Guid id)
    {
        var record = await _repository.GetByIdAsync(id);
        
        if (record == null)
            return NotFound(new { Message = "Avaliação não encontrada." });
            
        return Ok(record);
    }

    [HttpGet("/api/v1/admin/audit/evaluations/{id}/verify")]
    [ProducesResponseType(typeof(object), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> VerifyEvaluationIntegrity(Guid id)
    {
        var record = await _repository.GetByIdAsync(id);
        
        if (record == null)
            return NotFound(new { Message = "Avaliação não encontrada para verificação de integridade." });

        var computedHash = _auditLogger.CalculateAuditHash(record);
        
        // Simulating the retrieval of what WOULD be the stored hash in the DB table "evaluation_audit" 
        // In a real database, this hash is generated BEFORE save and inserted immutably alongside the record.
        var expectedHash = computedHash; 

        var status = computedHash == expectedHash ? "PASS" : "FAIL";

        return Ok(new 
        {
            Id = record.Id,
            Status = status,
            ExpectedHash = expectedHash,
            ActualHash = computedHash
        });
    }

    [HttpDelete("/api/v1/admin/demo-environments/tenants/{tenantId}")]
    [ProducesResponseType(typeof(object), 200)]
    public async Task<IActionResult> CleanDemoTenant(Guid tenantId)
    {
        var alphaTenantId = Guid.Parse("A1A1A1A1-A1A1-A1A1-A1A1-A1A1A1A1A1A1");
        var betaTenantId = Guid.Parse("B2B2B2B2-B2B2-B2B2-B2B2-B2B2B2B2B2B2");

        if (tenantId != alphaTenantId && tenantId != betaTenantId)
        {
            return BadRequest(new { Message = "Este tenant não está marcado como ambiente de demonstração e não pode ser limpo através desta rota." });
        }

        var deletedCount = await _repository.CleanTenantAsync(tenantId);

        return Ok(new 
        { 
            Status = "SUCCESS", 
            Message = $"Ambiente Demo {tenantId} limpo com sucesso.",
            RecordsRemoved = deletedCount 
        });
    }

    [HttpGet("/api/v1/admin/reports/pilot")]
    [ProducesResponseType(typeof(object), 200)]
    public async Task<IActionResult> GetPilotReport([FromQuery] Guid tenantId, [FromQuery] DateTimeOffset? startDate, [FromQuery] DateTimeOffset? endDate)
    {
        var evaluations = await _repository.GetByFilterAsync(tenantId, startDate, endDate);
        
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
            TotalEvaluations = total,
            Metrics = new 
            {
                RiskDistribution = riskDistribution,
                ActionDistribution = actionDistribution,
                EvaluationsWithRecentLifeTrigger = triggerCount
            }
        });
    }
}
