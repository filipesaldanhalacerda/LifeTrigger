using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LifeTrigger.Engine.Infrastructure.Repositories;

public class EfEvaluationRepository : IEvaluationRepository
{
    private readonly Data.AppDbContext _context;

    public EfEvaluationRepository(Data.AppDbContext context)
    {
        _context = context;
    }

    public async Task SaveAsync(EvaluationRecord evaluation)
    {
        _context.Evaluations.Add(evaluation);
        await _context.SaveChangesAsync();
    }

    public async Task<EvaluationRecord?> GetByIdAsync(Guid id)
    {
        return await _context.Evaluations.FirstOrDefaultAsync(e => e.Id == id);
    }

    public async Task<int> CleanTenantAsync(Guid tenantId)
    {
        // EF Core 7+ ExecuteDeleteAsync strategy. Needs EF serialization bypass for inner objects
        // However, because we mapped TenantId deeply inside a JSON string via value conversion, 
        // querying it via LINQ translation in EF might break depending on the provider.
        // As a workaround for this "JSON string column" approach, we query client-side natively.
        
        var allRecords = await _context.Evaluations.ToListAsync();
        
        var toDelete = allRecords
            .Where(e => e.Request.OperationalData.TenantId == tenantId)
            .ToList();

        if (!toDelete.Any())
        {
            return 0;
        }

        _context.Evaluations.RemoveRange(toDelete);
        await _context.SaveChangesAsync();

        return toDelete.Count;
    }

    public async Task<IEnumerable<EvaluationRecord>> GetByFilterAsync(Guid tenantId, DateTimeOffset? startDate, DateTimeOffset? endDate)
    {
        var allRecords = await _context.Evaluations.ToListAsync();
        
        var query = allRecords.Where(e => e.Request.OperationalData.TenantId == tenantId);

        if (startDate.HasValue)
            query = query.Where(e => e.Timestamp >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(e => e.Timestamp <= endDate.Value);

        return query.ToList();
    }
}
