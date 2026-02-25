using System;
using System.Threading;
using System.Threading.Tasks;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace LifeTrigger.Engine.Infrastructure.Repositories;

public class EfTenantSettingsRepository : ITenantSettingsRepository
{
    private readonly Data.AppDbContext _context;
    private readonly IMemoryCache _cache;

    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(1);

    public EfTenantSettingsRepository(Data.AppDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<TenantSettings?> GetByTenantIdAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var cacheKey = CacheKey(tenantId);

        if (_cache.TryGetValue(cacheKey, out TenantSettings? cached))
            return cached;

        var settings = await _context.TenantSettings
            .FirstOrDefaultAsync(t => t.TenantId == tenantId, cancellationToken);

        if (settings != null)
            _cache.Set(cacheKey, settings, CacheTtl);

        return settings;
    }

    public async Task UpsertAsync(TenantSettings settings, CancellationToken cancellationToken = default)
    {
        var existing = await _context.TenantSettings.FindAsync(
            new object[] { settings.TenantId }, cancellationToken);

        if (existing == null)
        {
            _context.TenantSettings.Add(settings);
        }
        else
        {
            _context.Entry(existing).CurrentValues.SetValues(settings);
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Invalidar cache após atualização
        _cache.Remove(CacheKey(settings.TenantId));
    }

    private static string CacheKey(Guid tenantId) => $"TenantSettings:{tenantId}";
}
