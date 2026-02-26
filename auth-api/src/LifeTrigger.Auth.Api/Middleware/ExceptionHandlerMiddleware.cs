using System.Net;
using System.Text.Json;

namespace LifeTrigger.Auth.Api.Middleware;

public class ExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlerMiddleware> _logger;

    public ExceptionHandlerMiddleware(RequestDelegate next, ILogger<ExceptionHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (status, title) = exception switch
        {
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "Unauthorized"),
            ArgumentException           => (HttpStatusCode.BadRequest, "Bad Request"),
            KeyNotFoundException        => (HttpStatusCode.NotFound, "Not Found"),
            _                           => (HttpStatusCode.InternalServerError, "Internal Server Error")
        };

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode  = (int)status;

        var problem = new
        {
            type   = $"https://httpstatuses.com/{(int)status}",
            title,
            status = (int)status,
            detail = exception.Message
        };

        return context.Response.WriteAsync(JsonSerializer.Serialize(problem));
    }
}
