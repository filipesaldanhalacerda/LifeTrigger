using System;

namespace LifeTrigger.Engine.Infrastructure.Providers;

using LifeTrigger.Engine.Application.Interfaces;

public class DefaultEngineContext : IEngineContext
{
    // Em Produção, isso poderia vir do IConfiguration/Options
    public string EngineVersion => "1.0.0";
    public string RuleSetVersion => "2026.02";
    
    // Resolve em tempo real, porém permite ser mockado nos Testes acoplando outra implementação de IEngineContext
    public DateTimeOffset CurrentTime => DateTimeOffset.UtcNow;
}
