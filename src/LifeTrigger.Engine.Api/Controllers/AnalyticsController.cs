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

        // All evaluations in the period — use raw SQL to extract TenantId and result fields
        var evaluations = await _db.Evaluations
            .Where(e => e.Timestamp >= since && e.Timestamp <= until)
            .OrderByDescending(e => e.Timestamp)
            .ToListAsync(ct);

        var total = evaluations.Count;

        // Per day
        var perDay = evaluations
            .GroupBy(e => e.Timestamp.Date)
            .Select(g => new { date = g.Key.ToString("yyyy-MM-dd"), count = g.Count() })
            .OrderBy(x => x.date)
            .ToList();

        // Per tenant (using the denormalized TenantId via shadow property)
        var perTenant = evaluations
            .GroupBy(e => e.Request?.OperationalData?.TenantId)
            .Where(g => g.Key.HasValue)
            .Select(g => new
            {
                tenantId = g.Key!.Value,
                count = g.Count(),
                lastEvaluation = g.Max(e => e.Timestamp),
            })
            .OrderByDescending(x => x.count)
            .Take(20)
            .ToList();

        // Per user (CreatedByUserId)
        var perUser = evaluations
            .Where(e => e.CreatedByUserId.HasValue)
            .GroupBy(e => e.CreatedByUserId!.Value)
            .Select(g => new
            {
                userId = g.Key,
                count = g.Count(),
                lastEvaluation = g.Max(e => e.Timestamp),
            })
            .OrderByDescending(x => x.count)
            .Take(20)
            .ToList();

        // Risk distribution
        var riskDistribution = evaluations
            .GroupBy(e => e.Result.RiskClassification.ToString())
            .Select(g => new { risk = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        // Action distribution
        var actionDistribution = evaluations
            .GroupBy(e => e.Result.RecommendedAction.ToString())
            .Select(g => new { action = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        // Average score
        var avgScore = total > 0
            ? Math.Round(evaluations.Average(e => (double)e.Result.CoverageEfficiencyScore), 1)
            : 0;

        // Avg gap
        var avgGap = total > 0
            ? Math.Round(evaluations.Average(e => (double)e.Result.ProtectionGapPercentage), 1)
            : 0;

        return Ok(new
        {
            periodDays = days,
            total,
            avgScore,
            avgGap,
            perDay,
            perTenant,
            perUser,
            riskDistribution,
            actionDistribution,
        });
    }
}
