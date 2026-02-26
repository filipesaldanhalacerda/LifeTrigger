using LifeTrigger.Auth.Application.Interfaces;
using LifeTrigger.Auth.Domain.Entities;
using LifeTrigger.Auth.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace LifeTrigger.Auth.Infrastructure.Repositories;

public class EfRefreshTokenRepository : IRefreshTokenRepository
{
    private readonly AuthDbContext _context;

    public EfRefreshTokenRepository(AuthDbContext context) => _context = context;

    public async Task<RefreshToken?> GetByHashAsync(string hash, CancellationToken ct = default)
        => await _context.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.TokenHash == hash, ct);

    public async Task AddAsync(RefreshToken token, CancellationToken ct = default)
    {
        await _context.RefreshTokens.AddAsync(token, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(RefreshToken token, CancellationToken ct = default)
    {
        _context.RefreshTokens.Update(token);
        await _context.SaveChangesAsync(ct);
    }

    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken ct = default)
    {
        await _context.RefreshTokens
            .Where(r => r.UserId == userId && r.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.RevokedAt, DateTimeOffset.UtcNow), ct);
    }

    public async Task DeleteExpiredAsync(CancellationToken ct = default)
    {
        await _context.RefreshTokens
            .Where(r => r.ExpiresAt <= DateTimeOffset.UtcNow)
            .ExecuteDeleteAsync(ct);
    }
}
