using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Entities;

namespace LifeTrigger.Engine.Infrastructure.Repositories;

public class InMemoryEvaluationRepository : IEvaluationRepository
{
    private readonly ConcurrentDictionary<Guid, EvaluationRecord> _store = new();

    public Task SaveAsync(EvaluationRecord record, CancellationToken cancellationToken = default)
    {
        _store[record.Id] = record;
        return Task.CompletedTask;
    }

    public Task<EvaluationRecord?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        _store.TryGetValue(id, out var record);
        return Task.FromResult(record);
    }

    public Task<int> CleanTenantAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        int count = 0;
        foreach (var kvp in _store)
        {
            if (kvp.Value.Request?.OperationalData?.TenantId == tenantId)
            {
                if (_store.TryRemove(kvp.Key, out _))
                    count++;
            }
        }
        return Task.FromResult(count);
    }

    public Task<IEnumerable<EvaluationRecord>> GetByFilterAsync(
        Guid tenantId,
        DateTimeOffset? startDate = null,
        DateTimeOffset? endDate = null,
        int limit = 500,
        int offset = 0,
        CancellationToken cancellationToken = default)
    {
        var result = _store.Values.Where(v => v.Request?.OperationalData?.TenantId == tenantId);

        if (startDate.HasValue)
            result = result.Where(v => v.Timestamp >= startDate.Value);

        if (endDate.HasValue)
            result = result.Where(v => v.Timestamp <= endDate.Value);

        result = result.OrderByDescending(v => v.Timestamp).Skip(offset).Take(limit);

        return Task.FromResult<IEnumerable<EvaluationRecord>>(result.ToList());
    }
}
