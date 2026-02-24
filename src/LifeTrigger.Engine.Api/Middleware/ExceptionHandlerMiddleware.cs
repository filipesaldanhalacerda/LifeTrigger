using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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
                    // Basic generic error response for security
                    var problemDetails = new ProblemDetails
                    {
                        Status = context.Response.StatusCode,
                        Title = "Foi encontrado um erro interno no servidor.",
                        Detail = contextFeature.Error.Message // Em produção mascarar o log real
                    };
                    
                    await context.Response.WriteAsJsonAsync(problemDetails);
                }
            });
        });
    }
}
