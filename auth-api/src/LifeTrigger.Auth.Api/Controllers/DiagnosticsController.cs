using LifeTrigger.Auth.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LifeTrigger.Auth.Api.Controllers;

[ApiController]
[Route("api/v1/diagnostics")]
[Authorize(Policy = "SuperAdmin")]
public class DiagnosticsController : ControllerBase
{
    private readonly AuthDbContext _db;

    public DiagnosticsController(AuthDbContext db) => _db = db;

    /// <summary>
    /// Returns auth-api health, DB stats, and table row counts.
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

        // DB size via pg_database_size
        long? dbSizeBytes = null;
        string? dbSizeHuman = null;
        try
        {
            var dbName = _db.Database.GetDbConnection().Database;
            var conn = _db.Database.GetDbConnection();
            await conn.OpenAsync(ct);
            using var cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT pg_database_size('{dbName}')";
            var result = await cmd.ExecuteScalarAsync(ct);
            if (result is long size)
            {
                dbSizeBytes = size;
                dbSizeHuman = FormatBytes(size);
            }
            await conn.CloseAsync();
        }
        catch { /* ignore — not critical */ }

        // Table row counts
        var userCount = await _db.Users.CountAsync(ct);
        var tenantCount = await _db.Tenants.CountAsync(ct);
        var loginEventCount = await _db.LoginEvents.CountAsync(ct);
        var refreshTokenCount = await _db.RefreshTokens.CountAsync(ct);
        var activeSessionCount = await _db.RefreshTokens
            .Where(r => r.RevokedAt == null && r.ExpiresAt > DateTimeOffset.UtcNow)
            .CountAsync(ct);

        // Active connections (PostgreSQL)
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
        catch { /* ignore */ }

        return Ok(new
        {
            service = "auth-api",
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
                users = userCount,
                tenants = tenantCount,
                loginEvents = loginEventCount,
                refreshTokens = refreshTokenCount,
                activeSessions = activeSessionCount,
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
