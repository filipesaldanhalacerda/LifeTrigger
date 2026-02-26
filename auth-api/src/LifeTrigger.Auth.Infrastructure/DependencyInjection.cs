using LifeTrigger.Auth.Application.Interfaces;
using LifeTrigger.Auth.Infrastructure.Data;
using LifeTrigger.Auth.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LifeTrigger.Auth.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection not configured.");

        services.AddDbContext<AuthDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddScoped<ITenantRepository, EfTenantRepository>();
        services.AddScoped<IRefreshTokenRepository, EfRefreshTokenRepository>();

        return services;
    }
}
