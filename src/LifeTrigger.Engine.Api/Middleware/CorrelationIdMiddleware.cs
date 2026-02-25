using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace LifeTrigger.Engine.Api.Middleware;

public static class CorrelationIdMiddleware
{
    private const string CorrelationIdHeader = "X-Correlation-ID";

    public static IApplicationBuilder UseCorrelationId(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            if (!context.Request.Headers.TryGetValue(CorrelationIdHeader, out var correlationId)
                || string.IsNullOrWhiteSpace(correlationId))
            {
                correlationId = Guid.NewGuid().ToString("N");
            }

            var correlationIdStr = correlationId.ToString();
            context.Response.Headers.Append(CorrelationIdHeader, correlationIdStr);

            var loggerFactory = context.RequestServices.GetRequiredService<ILoggerFactory>();
            var logger = loggerFactory.CreateLogger("CorrelationId");

            using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationIdStr }))
            {
                await next(context);
            }
        });
    }
}
