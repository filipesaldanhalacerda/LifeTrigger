using LifeTrigger.Auth.Application.Interfaces;
using LifeTrigger.Auth.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace LifeTrigger.Auth.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<ITokenService, TokenService>();
        return services;
    }
}
