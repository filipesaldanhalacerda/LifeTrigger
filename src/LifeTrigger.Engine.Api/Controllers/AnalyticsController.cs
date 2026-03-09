using LifeTrigger.Engine.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LifeTrigger.Engine.Api.Controllers;

[ApiController]
[Route("api/v1/analytics")]
[Authorize(Policy = "SuperAdmin")]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AnalyticsController(AppDbContext db) => _db = db;

    /// <summary>
    /// Returns evaluation analytics: totals, per-day, per-tenant, per-user, risk/action distribution.
    /// </summary>
    [HttpGet("evaluations")]
    public async Task<IActionResult> GetEvaluationAnalytics(
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null,
        [FromQuery] int days = 30,
        CancellationToken ct = default)
    {
        DateTimeOffset since;
        DateTimeOffset until;

        if (!string.IsNullOrWhiteSpace(startDate) && !string.IsNullOrWhiteSpace(endDate)
            && DateOnly.TryParse(startDate, out var sd) && DateOnly.TryParse(endDate, out var ed))
        {
            since = new DateTimeOffset(sd.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            until = new DateTimeOffset(ed.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero);
            days = (int)Math.Ceiling((until - since).TotalDays);
        }
        else
        {
            days = Math.Clamp(days, 1, 365);
            since = DateTimeOffset.UtcNow.AddDays(-days);
            until = DateTimeOffset.UtcNow;
        }

        // Per-day counts — executed in DB (no JSONB needed)
        var perDay = await _db.Evaluations
            .Where(e => e.Timestamp >= since && e.Timestamp <= until)
            .GroupBy(e => e.Timestamp.Date)
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToListAsync(ct);

        var total = perDay.Sum(x => x.count);

        // Per tenant — use denormalized shadow property TenantId (not JSONB navigation)
        var perTenant = await _db.Evaluations
            .Where(e => e.Timestamp >= since && e.Timestamp <= until
                        && EF.Property<Guid?>(e, "TenantId") != null)
            .GroupBy(e => EF.Property<Guid?>(e, "TenantId")!.Value)
            .Select(g => new { tenantId = g.Key, count = g.Count(), lastEvaluation = g.Max(e => e.Timestamp) })
            .OrderByDescending(x => x.count)
            .Take(20)
            .ToListAsync(ct);

        // Per user — executed in DB via indexed column
        var perUser = await _db.Evaluations
            .Where(e => e.Timestamp >= since && e.Timestamp <= until && e.CreatedByUserId.HasValue)
            .GroupBy(e => e.CreatedByUserId!.Value)
            .Select(g => new { userId = g.Key, count = g.Count(), lastEvaluation = g.Max(e => e.Timestamp) })
            .OrderByDescending(x => x.count)
            .Take(20)
            .ToListAsync(ct);

        // JSONB fields — load entities in memory then project
        // (HasConversion columns can't be navigated in LINQ-to-SQL)
        var evaluations = await _db.Evaluations
            .Where(e => e.Timestamp >= since && e.Timestamp <= until)
            .Select(e => new { e.Result })
            .ToListAsync(ct);

        var projected = evaluations
            .Where(e => e.Result != null)
            .Select(e => new
            {
                risk = e.Result.RiskClassification,
                action = e.Result.RecommendedAction,
                score = e.Result.CoverageEfficiencyScore,
                gap = e.Result.ProtectionGapPercentage,
            })
            .ToList();

        var riskDistribution = projected
            .GroupBy(e => e.risk.ToString())
            .Select(g => new { risk = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        var actionDistribution = projected
            .GroupBy(e => e.action.ToString())
            .Select(g => new { action = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        var avgScore = projected.Count > 0
            ? Math.Round(projected.Average(e => (double)e.score), 1)
            : 0;

        var avgGap = projected.Count > 0
            ? Math.Round(projected.Average(e => (double)e.gap), 1)
            : 0;

        return Ok(new
        {
            periodDays = days,
            total,
            avgScore,
            avgGap,
            perDay = perDay.Select(x => new { date = x.date.ToString("yyyy-MM-dd"), x.count }),
            perTenant,
            perUser,
            riskDistribution,
            actionDistribution,
        });
    }
}
