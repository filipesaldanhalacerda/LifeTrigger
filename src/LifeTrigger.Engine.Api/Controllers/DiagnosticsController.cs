using LifeTrigger.Engine.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LifeTrigger.Engine.Api.Controllers;

[ApiController]
[Route("api/v1/engine-diagnostics")]
[Authorize(Policy = "SuperAdmin")]
public class DiagnosticsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<DiagnosticsController> _logger;

    public DiagnosticsController(AppDbContext db, ILogger<DiagnosticsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Returns engine-api health, DB stats, and table row counts.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetDiagnostics(CancellationToken ct)
    {
        var dbHealthy = true;
        string? dbError = null;
        try
        {
            await _db.Database.CanConnectAsync(ct);
        }
        catch (Exception ex)
        {
            dbHealthy = false;
            dbError = ex.Message;
        }

        // DB size
        long? dbSizeBytes = null;
        string? dbSizeHuman = null;
        try
        {
            var dbName = _db.Database.GetDbConnection().Database;
            var conn = _db.Database.GetDbConnection();
            await conn.OpenAsync(ct);
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT pg_database_size(current_database())";
            var result = await cmd.ExecuteScalarAsync(ct);
            if (result is long size)
            {
                dbSizeBytes = size;
                dbSizeHuman = FormatBytes(size);
            }
            await conn.CloseAsync();
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Diagnostics: failed to get DB size"); }

        // Table row counts
        var evaluationCount = await _db.Evaluations.CountAsync(ct);
        var tenantSettingsCount = await _db.TenantSettings.CountAsync(ct);
        var idempotencyKeyCount = await _db.IdempotencyKeys.CountAsync(ct);

        // Active connections
        int? activeConnections = null;
        int? maxConnections = null;
        try
        {
            var conn = _db.Database.GetDbConnection();
            await conn.OpenAsync(ct);
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'";
            var result = await cmd.ExecuteScalarAsync(ct);
            activeConnections = Convert.ToInt32(result);

            using var cmd2 = conn.CreateCommand();
            cmd2.CommandText = "SHOW max_connections";
            var result2 = await cmd2.ExecuteScalarAsync(ct);
            maxConnections = int.TryParse(result2?.ToString(), out var mc) ? mc : null;
            await conn.CloseAsync();
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Diagnostics: failed to get connection stats"); }

        return Ok(new
        {
            service = "engine-api",
            status = dbHealthy ? "healthy" : "degraded",
            timestamp = DateTimeOffset.UtcNow,
            database = new
            {
                connected = dbHealthy,
                error = dbError,
                sizeBytes = dbSizeBytes,
                sizeHuman = dbSizeHuman,
                activeConnections,
                maxConnections,
            },
            tables = new
            {
                evaluations = evaluationCount,
                tenantSettings = tenantSettingsCount,
                idempotencyKeys = idempotencyKeyCount,
            },
        });
    }

    private static string FormatBytes(long bytes)
    {
        string[] sizes = ["B", "KB", "MB", "GB", "TB"];
        int order = 0;
        double size = bytes;
        while (size >= 1024 && order < sizes.Length - 1)
        {
            order++;
            size /= 1024;
        }
        return $"{size:0.##} {sizes[order]}";
    }
}
