using System;
using System.Threading;
using System.Threading.Tasks;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Infrastructure.Data;
using LifeTrigger.Engine.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace LifeTrigger.Engine.Infrastructure.Services;

public class PostgresIdempotencyService : IIdempotencyService
{
    private readonly AppDbContext _context;

    public PostgresIdempotencyService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<(bool Found, int StatusCode, string Body)> GetAsync(string key, CancellationToken cancellationToken = default)
    {
        var record = await _context.IdempotencyKeys
            .FirstOrDefaultAsync(k => k.Key == key && k.ExpiresAt > DateTimeOffset.UtcNow, cancellationToken);

        if (record == null)
            return (false, 0, string.Empty);

        return (true, record.StatusCode, record.ResponseBody);
    }

    public async Task StoreAsync(string key, int statusCode, string body, TimeSpan ttl, CancellationToken cancellationToken = default)
    {
        var record = new IdempotencyKey
        {
            Key = key,
            StatusCode = statusCode,
            ResponseBody = body,
            ExpiresAt = DateTimeOffset.UtcNow.Add(ttl)
        };

        // Upsert: ignora conflito de chave duplicada (requisição concorrente já gravou)
        var existing = await _context.IdempotencyKeys.FindAsync(new object[] { key }, cancellationToken);
        if (existing == null)
        {
            _context.IdempotencyKeys.Add(record);
            try { await _context.SaveChangesAsync(cancellationToken); }
            catch (DbUpdateException) { /* race condition: outro processo gravou primeiro */ }
        }
    }
}
