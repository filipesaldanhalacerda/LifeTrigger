using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Infrastructure.Repositories;
using LifeTrigger.Engine.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LifeTrigger.Engine.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<Data.AppDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IEvaluationRepository, EfEvaluationRepository>();
        services.AddScoped<ITenantSettingsRepository, EfTenantSettingsRepository>();
        services.AddScoped<IIdempotencyService, PostgresIdempotencyService>();

        services.AddScoped<IEngineContext, Providers.DefaultEngineContext>();
        services.AddSingleton<IRuleJustificationProvider, Providers.DefaultRuleJustificationProvider>();
        services.AddSingleton<IRuleJustificationRenderer, Providers.PtBrJustificationRenderer>();

        return services;
    }
}
