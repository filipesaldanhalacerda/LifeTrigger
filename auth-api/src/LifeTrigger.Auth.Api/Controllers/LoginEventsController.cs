using LifeTrigger.Auth.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LifeTrigger.Auth.Api.Controllers;

[ApiController]
[Route("api/v1/login-events")]
[Authorize(Policy = "SuperAdmin")]
public class LoginEventsController : ControllerBase
{
    private readonly AuthDbContext _db;

    public LoginEventsController(AuthDbContext db) => _db = db;

    // GET /api/v1/login-events?startDate=2026-01-01&endDate=2026-03-06&limit=500
    // Falls back to ?days=7 if dates not provided.
    [HttpGet]
    public async Task<IActionResult> GetEvents(
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null,
        [FromQuery] int days = 7,
        [FromQuery] int limit = 500,
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 2000);

        DateTimeOffset since;
        DateTimeOffset until;

        if (!string.IsNullOrWhiteSpace(startDate) && !string.IsNullOrWhiteSpace(endDate)
            && DateOnly.TryParse(startDate, out var sd) && DateOnly.TryParse(endDate, out var ed))
        {
            since = new DateTimeOffset(sd.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            until = new DateTimeOffset(ed.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero);
            days  = (int)Math.Ceiling((until - since).TotalDays);
        }
        else
        {
            days  = Math.Clamp(days, 1, 90);
            since = DateTimeOffset.UtcNow.AddDays(-days);
            until = DateTimeOffset.UtcNow;
        }

        var events = await _db.LoginEvents
            .Where(e => e.Timestamp >= since && e.Timestamp <= until)
            .OrderByDescending(e => e.Timestamp)
            .Take(limit)
            .Select(e => new
            {
                e.Id,
                e.UserId,
                e.Email,
                e.Role,
                e.TenantId,
                e.Success,
                e.FailReason,
                e.IpAddress,
                e.UserAgent,
                e.Timestamp,
            })
            .ToListAsync(ct);

        // Summary stats
        var allInPeriod = await _db.LoginEvents
            .Where(e => e.Timestamp >= since && e.Timestamp <= until)
            .ToListAsync(ct);

        var totalLogins      = allInPeriod.Count;
        var successfulLogins = allInPeriod.Count(e => e.Success);
        var failedLogins     = allInPeriod.Count(e => !e.Success);
        var uniqueUsers      = allInPeriod.Where(e => e.Success).Select(e => e.UserId).Distinct().Count();
        var uniqueIps        = allInPeriod.Where(e => e.Success).Select(e => e.IpAddress).Where(ip => ip != null).Distinct().Count();

        // Active sessions (users with refresh tokens not revoked and not expired)
        var activeSessions = await _db.RefreshTokens
            .Where(r => r.RevokedAt == null && r.ExpiresAt > DateTimeOffset.UtcNow)
            .Select(r => r.UserId)
            .Distinct()
            .CountAsync(ct);

        // Logins per day
        var loginsPerDay = allInPeriod
            .Where(e => e.Success)
            .GroupBy(e => e.Timestamp.Date)
            .Select(g => new { date = g.Key.ToString("yyyy-MM-dd"), count = g.Count() })
            .OrderBy(x => x.date)
            .ToList();

        // Top users by login count
        var topUsers = allInPeriod
            .Where(e => e.Success)
            .GroupBy(e => new { e.UserId, e.Email, e.Role })
            .Select(g => new { g.Key.Email, g.Key.Role, count = g.Count(), lastLogin = g.Max(e => e.Timestamp) })
            .OrderByDescending(x => x.count)
            .Take(10)
            .ToList();

        return Ok(new
        {
            summary = new
            {
                totalLogins,
                successfulLogins,
                failedLogins,
                uniqueUsers,
                uniqueIps,
                activeSessions,
                periodDays = days,
            },
            loginsPerDay,
            topUsers,
            events,
        });
    }
}
