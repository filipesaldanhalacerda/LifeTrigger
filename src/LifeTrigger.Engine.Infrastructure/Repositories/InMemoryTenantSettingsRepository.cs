using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Entities;

namespace LifeTrigger.Engine.Infrastructure.Repositories;

public class InMemoryTenantSettingsRepository : ITenantSettingsRepository
{
    private readonly ConcurrentDictionary<Guid, TenantSettings> _store = new();

    public Task<TenantSettings?> GetByTenantIdAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        _store.TryGetValue(tenantId, out var settings);
        return Task.FromResult(settings);
    }

    public Task UpsertAsync(TenantSettings settings, CancellationToken cancellationToken = default)
    {
        _store[settings.TenantId] = settings;
        return Task.CompletedTask;
    }
}
