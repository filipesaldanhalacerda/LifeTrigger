using System;
using System.Threading;
using System.Threading.Tasks;
using LifeTrigger.Engine.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LifeTrigger.Engine.Infrastructure.Services;

public class IdempotencyCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<IdempotencyCleanupService> _logger;

    private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(1);

    public IdempotencyCleanupService(IServiceScopeFactory scopeFactory, ILogger<IdempotencyCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("IdempotencyCleanupService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(CleanupInterval, stoppingToken);

            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var deleted = await context.IdempotencyKeys
                    .Where(k => k.ExpiresAt <= DateTimeOffset.UtcNow)
                    .ExecuteDeleteAsync(stoppingToken);

                if (deleted > 0)
                    _logger.LogInformation("IdempotencyCleanup: removed {Count} expired keys.", deleted);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "IdempotencyCleanup: error during cleanup.");
            }
        }

        _logger.LogInformation("IdempotencyCleanupService stopped.");
    }
}
