using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LifeTrigger.Engine.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<Data.AppDbContext>(options =>
            options.UseSqlServer(connectionString));

        services.AddScoped<IEvaluationRepository, EfEvaluationRepository>();
        services.AddScoped<ITenantSettingsRepository, EfTenantSettingsRepository>();
        return services;
    }
}
