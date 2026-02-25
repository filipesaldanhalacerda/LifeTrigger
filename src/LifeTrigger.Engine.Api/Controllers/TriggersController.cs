using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using FluentValidation;
using FluentValidation.Results;
using LifeTrigger.Engine.Application.Interfaces;
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
[Authorize]
[EnableRateLimiting("evaluation")]
public class TriggersController : ControllerBase
{
    private readonly ILifeInsuranceCalculator _calculator;
    private readonly IEvaluationRepository _repository;
    private readonly IValidator<LifeInsuranceAssessmentRequest> _validator;
    private readonly IAuditLoggerService _auditLogger;
    private readonly IEngineContext _engineContext;

    public TriggersController(
        ILifeInsuranceCalculator calculator,
        IEvaluationRepository repository,
        IValidator<LifeInsuranceAssessmentRequest> validator,
        IAuditLoggerService auditLogger,
        IEngineContext engineContext)
    {
        _calculator = calculator;
        _repository = repository;
        _validator = validator;
        _auditLogger = auditLogger;
        _engineContext = engineContext;
    }

    [HttpPost]
    [TypeFilter(typeof(IdempotencyFilterAttribute))]
    [ProducesResponseType(typeof(LifeInsuranceAssessmentResult), 200)]
    [ProducesResponseType(typeof(object), 400)]
    public async Task<IActionResult> RegisterLifeTrigger([FromBody] LifeTriggerEvent triggerEvent, CancellationToken cancellationToken)
    {
        var revisedRequest = triggerEvent.BaseRequest with
        {
            OperationalData = triggerEvent.BaseRequest.OperationalData with
            {
               RecentLifeTrigger = true
            }
        };

        ValidationResult validationResult = await _validator.ValidateAsync(revisedRequest, cancellationToken);
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
            EngineVersion: _engineContext.EngineVersion,
            RuleSetVersion: _engineContext.RuleSetVersion,
            Request: revisedRequest,
            Result: result
        );

        record = record with { AuditHash = _auditLogger.CalculateAuditHash(record) };

        await _repository.SaveAsync(record, cancellationToken);

        _auditLogger.LogEvaluationCompleted(record);
        Response.Headers.Append("X-Evaluation-Id", record.Id.ToString());

        return Ok(result);
    }
}
