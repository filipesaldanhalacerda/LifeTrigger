using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace LifeTrigger.Engine.Api.Middleware;

public static class ExceptionHandlerMiddleware
{
    public static void UseCustomExceptionHandler(this IApplicationBuilder app)
    {
        app.UseExceptionHandler(appError =>
        {
            appError.Run(async context =>
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                context.Response.ContentType = "application/json";

                var contextFeature = context.Features.Get<IExceptionHandlerFeature>();
                if (contextFeature != null)
                {
                    var logger = context.RequestServices
                        .GetRequiredService<ILogger<Program>>();

                    logger.LogError(
                        contextFeature.Error,
                        "Unhandled exception on {Method} {Path}",
                        context.Request.Method,
                        context.Request.Path);

                    var problemDetails = new ProblemDetails
                    {
                        Status = context.Response.StatusCode,
                        Title = "Foi encontrado um erro interno no servidor.",
                        Detail = "Ocorreu um erro inesperado. Por favor, tente novamente ou entre em contato com o suporte informando o horário da requisição."
                    };

                    await context.Response.WriteAsJsonAsync(problemDetails);
                }
            });
        });
    }
}
