using System;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Caching.Memory;

namespace LifeTrigger.Engine.Api.Filters;

public class IdempotencyFilterAttribute : ActionFilterAttribute
{
    private readonly IMemoryCache _cache;

    public IdempotencyFilterAttribute(IMemoryCache cache)
    {
        _cache = cache;
    }

    public override void OnActionExecuting(ActionExecutingContext context)
    {
        if (context.HttpContext.Request.Headers.TryGetValue("Idempotency-Key", out var headerValue))
        {
            var keyStr = headerValue.ToString();
            
            // Generate a CacheKey using the context path to isolate idempotency keys between /evaluations and /triggers
            var cacheKey = $"Idempotency:{context.HttpContext.Request.Path}:{keyStr}";

            if (_cache.TryGetValue(cacheKey, out ObjectResult cachedResult))
            {
                context.Result = cachedResult;
                return;
            }

            // Bind the cache key to HttpContext so OnActionExecuted can store the resultant output
            context.HttpContext.Items["IdempotencyCacheKey"] = cacheKey;
        }

        base.OnActionExecuting(context);
    }

    public override void OnActionExecuted(ActionExecutedContext context)
    {
        if (context.HttpContext.Items.TryGetValue("IdempotencyCacheKey", out var cacheKeyObj) && cacheKeyObj is string cacheKey)
        {
            if (context.Result is ObjectResult objectResult && (objectResult.StatusCode == 200 || objectResult.StatusCode == 201))
            {
                _cache.Set(cacheKey, objectResult, TimeSpan.FromHours(24)); // Storing Idempotency keys for 24 hours
            }
        }

        base.OnActionExecuted(context);
    }
}
