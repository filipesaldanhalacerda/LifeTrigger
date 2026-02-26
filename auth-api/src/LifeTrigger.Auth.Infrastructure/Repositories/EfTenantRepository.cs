using LifeTrigger.Auth.Application.Interfaces;
using LifeTrigger.Auth.Domain.Entities;
using LifeTrigger.Auth.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace LifeTrigger.Auth.Infrastructure.Repositories;

public class EfTenantRepository : ITenantRepository
{
    private readonly AuthDbContext _context;

    public EfTenantRepository(AuthDbContext context) => _context = context;

    public async Task<Tenant?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _context.Tenants.FirstOrDefaultAsync(t => t.Id == id, ct);

    public async Task<Tenant?> GetBySlugAsync(string slug, CancellationToken ct = default)
        => await _context.Tenants.FirstOrDefaultAsync(t => t.Slug == slug, ct);

    public async Task<IReadOnlyList<Tenant>> GetAllAsync(CancellationToken ct = default)
        => await _context.Tenants.OrderBy(t => t.Name).ToListAsync(ct);

    public async Task AddAsync(Tenant tenant, CancellationToken ct = default)
    {
        await _context.Tenants.AddAsync(tenant, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Tenant tenant, CancellationToken ct = default)
    {
        _context.Tenants.Update(tenant);
        await _context.SaveChangesAsync(ct);
    }
}
