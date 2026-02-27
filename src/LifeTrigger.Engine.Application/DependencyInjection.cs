using FluentValidation;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Application.Services;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace LifeTrigger.Engine.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<ILifeInsuranceCalculator, LifeInsuranceCalculator>();
        services.AddScoped<IAuditLoggerService, AuditLoggerService>();
        services.AddSingleton<IBrokerInsightGenerator, BrokerInsightGenerator>();
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        return services;
    }
}
