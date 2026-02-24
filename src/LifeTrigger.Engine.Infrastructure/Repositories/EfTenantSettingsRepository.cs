using System;
using System.Threading.Tasks;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LifeTrigger.Engine.Infrastructure.Repositories;

public class EfTenantSettingsRepository : ITenantSettingsRepository
{
    private readonly Data.AppDbContext _context;

    public EfTenantSettingsRepository(Data.AppDbContext context)
    {
        _context = context;
    }

    public async Task<TenantSettings?> GetByTenantIdAsync(Guid tenantId)
    {
        return await _context.TenantSettings.FirstOrDefaultAsync(t => t.TenantId == tenantId);
    }

    public async Task UpsertAsync(TenantSettings settings)
    {
        var existing = await _context.TenantSettings.FindAsync(settings.TenantId);
        
        if (existing == null)
        {
            _context.TenantSettings.Add(settings);
        }
        else
        {
            // Update values avoiding object tracking collision
            _context.Entry(existing).CurrentValues.SetValues(settings);
        }

        await _context.SaveChangesAsync();
    }
}
