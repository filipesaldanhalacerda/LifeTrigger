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

public record LifeTriggerEvent(
    string TriggerType, // Casamento, NovoFilho, Imovel, etc
    string Description,
    DateTimeOffset EventDate,
    LifeInsuranceAssessmentRequest BaseRequest
);

[ApiController]
[Route("api/v1/[controller]")]
public class TriggersController : ControllerBase
{
    private readonly ILifeInsuranceCalculator _calculator;
    private readonly IEvaluationRepository _repository;
    private readonly IValidator<LifeInsuranceAssessmentRequest> _validator;
    private readonly IAuditLoggerService _auditLogger;

    public TriggersController(
        ILifeInsuranceCalculator calculator,
        IEvaluationRepository repository,
        IValidator<LifeInsuranceAssessmentRequest> validator,
        IAuditLoggerService auditLogger)
    {
        _calculator = calculator;
        _repository = repository;
        _validator = validator;
        _auditLogger = auditLogger;
    }

    [HttpPost]
    [TypeFilter(typeof(IdempotencyFilterAttribute))]
    [ProducesResponseType(typeof(LifeInsuranceAssessmentResult), 200)]
    [ProducesResponseType(typeof(object), 400)]
    public async Task<IActionResult> RegisterLifeTrigger([FromBody] LifeTriggerEvent triggerEvent)
    {
        // Se a entidade engatilhou um evento de vida e incluiu os dados completos novos da pessoa (BaseRequest),
        // ativamos no request da API que ocorreu um gatilho de vida para forçar a ação determinística "REVISAR".
        
        var revisedRequest = triggerEvent.BaseRequest with 
        { 
            OperationalData = triggerEvent.BaseRequest.OperationalData with 
            { 
               RecentLifeTrigger = true 
            } 
        };

        ValidationResult validationResult = await _validator.ValidateAsync(revisedRequest);
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
            return BadRequest(new { Message = "Validation Failed for the supplied AssessmentRequest", Errors = errors });
        }

        var result = _calculator.Calculate(revisedRequest);

        var record = new EvaluationRecord(
            Id: Guid.NewGuid(),
            Timestamp: DateTimeOffset.UtcNow,
            EngineVersion: "1.0.0",
            RuleSetVersion: "2026.02",
            Request: revisedRequest,
            Result: result
        );

        await _repository.SaveAsync(record);
        
        _auditLogger.LogEvaluationCompleted(record);
        Response.Headers.Append("X-Evaluation-Id", record.Id.ToString());

        return Ok(result);
    }
}
