using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LifeTrigger.Engine.Domain.Entities;

namespace LifeTrigger.Engine.Application.Interfaces;

public interface IEvaluationRepository
{
    Task SaveAsync(EvaluationRecord record);
    Task<EvaluationRecord?> GetByIdAsync(Guid id);
    Task<int> CleanTenantAsync(Guid tenantId);
    Task<IEnumerable<EvaluationRecord>> GetByFilterAsync(Guid tenantId, DateTimeOffset? startDate = null, DateTimeOffset? endDate = null, int limit = 500, int offset = 0);
}
