using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Infrastructure.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace LifeTrigger.Engine.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<IEvaluationRepository, InMemoryEvaluationRepository>();
        services.AddSingleton<ITenantSettingsRepository, InMemoryTenantSettingsRepository>();
        return services;
    }
}
