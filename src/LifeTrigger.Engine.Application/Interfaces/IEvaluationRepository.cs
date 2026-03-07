using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using LifeTrigger.Engine.Domain.Entities;

namespace LifeTrigger.Engine.Application.Interfaces;

public interface IEvaluationRepository
{
    Task SaveAsync(EvaluationRecord record, CancellationToken cancellationToken = default);
    Task<EvaluationRecord?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<int> CleanTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<IEnumerable<EvaluationRecord>> GetByFilterAsync(Guid tenantId, DateTimeOffset? startDate = null, DateTimeOffset? endDate = null, int limit = 500, int offset = 0, Guid? createdByUserId = null, CancellationToken cancellationToken = default);
    Task<bool> UpdateStatusAsync(Guid id, Domain.Enums.EvaluationStatus status, CancellationToken cancellationToken = default);
}
