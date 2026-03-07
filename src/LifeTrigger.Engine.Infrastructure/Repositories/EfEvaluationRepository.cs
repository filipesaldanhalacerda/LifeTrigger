using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Entities;
using LifeTrigger.Engine.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace LifeTrigger.Engine.Infrastructure.Repositories;

public class EfEvaluationRepository : IEvaluationRepository
{
    private readonly Data.AppDbContext _context;

    public EfEvaluationRepository(Data.AppDbContext context)
    {
        _context = context;
    }

    public async Task SaveAsync(EvaluationRecord evaluation, CancellationToken cancellationToken = default)
    {
        _context.Evaluations.Add(evaluation);

        // Popula a coluna desnormalizada TenantId para filtragem eficiente no banco
        _context.Entry(evaluation)
            .Property<Guid?>("TenantId").CurrentValue = evaluation.Request.OperationalData.TenantId;

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<EvaluationRecord?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Evaluations.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
    }

    public async Task<int> CleanTenantAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        // ExecuteDeleteAsync: deleta no banco sem carregar registros em memória (zero N+1)
        return await _context.Evaluations
            .Where(e => EF.Property<Guid?>(e, "TenantId") == tenantId)
            .ExecuteDeleteAsync(cancellationToken);
    }

    public async Task<IEnumerable<EvaluationRecord>> GetByFilterAsync(
        Guid tenantId,
        DateTimeOffset? startDate = null,
        DateTimeOffset? endDate = null,
        int limit = 500,
        int offset = 0,
        Guid? createdByUserId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Evaluations
            .Where(e => EF.Property<Guid?>(e, "TenantId") == tenantId);

        if (startDate.HasValue)
            query = query.Where(e => e.Timestamp >= startDate.Value.ToUniversalTime());

        if (endDate.HasValue)
            query = query.Where(e => e.Timestamp <= endDate.Value.ToUniversalTime());

        // Broker-level ownership filter: restrict to evaluations created by this user
        if (createdByUserId.HasValue)
            query = query.Where(e => e.CreatedByUserId == createdByUserId.Value);

        return await query
            .OrderByDescending(e => e.Timestamp)
            .Skip(offset)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> UpdateStatusAsync(Guid id, EvaluationStatus status, CancellationToken cancellationToken = default)
    {
        var count = await _context.Evaluations
            .Where(e => e.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.Status, status), cancellationToken);
        return count > 0;
    }
}
