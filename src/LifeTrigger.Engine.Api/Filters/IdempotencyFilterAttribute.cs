using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;
using LifeTrigger.Engine.Application.Interfaces;

namespace LifeTrigger.Engine.Api.Filters;

public class IdempotencyFilterAttribute : IAsyncActionFilter
{
    private readonly IIdempotencyService _idempotencyService;
    private readonly JsonSerializerOptions _jsonOptions;

    private static readonly TimeSpan DefaultTtl = TimeSpan.FromHours(24);

    public IdempotencyFilterAttribute(IIdempotencyService idempotencyService, IOptions<JsonOptions> jsonOptions)
    {
        _idempotencyService = idempotencyService;
        _jsonOptions = jsonOptions.Value.JsonSerializerOptions;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!context.HttpContext.Request.Headers.TryGetValue("Idempotency-Key", out var headerValue))
        {
            await next();
            return;
        }

        var keyStr = headerValue.ToString();
        // Isola chaves por path para evitar colisão entre /evaluations e /triggers
        var cacheKey = $"Idempotency:{context.HttpContext.Request.Path}:{keyStr}";

        var (found, statusCode, body) = await _idempotencyService.GetAsync(cacheKey);
        if (found)
        {
            var cachedValue = JsonSerializer.Deserialize<object>(body, _jsonOptions);
            context.Result = new ObjectResult(cachedValue) { StatusCode = statusCode };
            return;
        }

        var executed = await next();

        if (executed.Result is ObjectResult objectResult
            && (objectResult.StatusCode == 200 || objectResult.StatusCode == 201)
            && objectResult.Value != null)
        {
            var serialized = JsonSerializer.Serialize(objectResult.Value, _jsonOptions);
            await _idempotencyService.StoreAsync(cacheKey, objectResult.StatusCode ?? 200, serialized, DefaultTtl);
        }
    }
}
