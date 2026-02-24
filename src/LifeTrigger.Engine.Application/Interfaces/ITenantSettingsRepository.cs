using System;
using System.Threading.Tasks;
using LifeTrigger.Engine.Domain.Entities;

namespace LifeTrigger.Engine.Application.Interfaces;

public interface ITenantSettingsRepository
{
    Task<TenantSettings?> GetByTenantIdAsync(Guid tenantId);
    Task UpsertAsync(TenantSettings settings);
}
