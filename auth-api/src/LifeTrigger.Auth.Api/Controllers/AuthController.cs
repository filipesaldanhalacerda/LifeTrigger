using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LifeTrigger.Auth.Application.Interfaces;
using LifeTrigger.Auth.Domain.Entities;
using LifeTrigger.Auth.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LifeTrigger.Auth.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly ITokenService _tokenService;
    private readonly ITenantRepository _tenants;
    private readonly AuthDbContext _db;

    public AuthController(
        IUserRepository users,
        IRefreshTokenRepository refreshTokens,
        ITokenService tokenService,
        ITenantRepository tenants,
        AuthDbContext db)
    {
        _users         = users;
        _refreshTokens = refreshTokens;
        _tokenService  = tokenService;
        _tenants       = tenants;
        _db            = db;
    }

    // POST /api/v1/auth/login
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var ip        = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = HttpContext.Request.Headers.UserAgent.ToString();
        if (userAgent?.Length > 512) userAgent = userAgent[..512];

        var user = await _users.GetByEmailAsync(request.Email, cancellationToken);
        if (user is null || !user.IsActive || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            // Record failed login (only if user exists)
            if (user is not null)
            {
                _db.LoginEvents.Add(new LoginEvent
                {
                    Id         = Guid.NewGuid(),
                    UserId     = user.Id,
                    Email      = user.Email,
                    Role       = user.Role.ToString(),
                    TenantId   = user.TenantId,
                    Success    = false,
                    FailReason = "INVALID_CREDENTIALS",
                    IpAddress  = ip,
                    UserAgent  = userAgent,
                });
                await _db.SaveChangesAsync(cancellationToken);
            }
            return Unauthorized(new { code = "INVALID_CREDENTIALS", message = "E-mail ou senha inválidos." });
        }

        // Check if the user's tenant is still active
        if (user.TenantId.HasValue)
        {
            var tenant = await _tenants.GetByIdAsync(user.TenantId.Value, cancellationToken);
            if (tenant is null || !tenant.IsActive)
            {
                _db.LoginEvents.Add(new LoginEvent
                {
                    Id         = Guid.NewGuid(),
                    UserId     = user.Id,
                    Email      = user.Email,
                    Role       = user.Role.ToString(),
                    TenantId   = user.TenantId,
                    Success    = false,
                    FailReason = "TENANT_INACTIVE",
                    IpAddress  = ip,
                    UserAgent  = userAgent,
                });
                await _db.SaveChangesAsync(cancellationToken);
                return Unauthorized(new { code = "TENANT_INACTIVE", message = "Sua organização foi desativada. Entre em contato com o suporte LifeTrigger." });
            }
        }

        // Record successful login
        _db.LoginEvents.Add(new LoginEvent
        {
            Id        = Guid.NewGuid(),
            UserId    = user.Id,
            Email     = user.Email,
            Role      = user.Role.ToString(),
            TenantId  = user.TenantId,
            Success   = true,
            IpAddress = ip,
            UserAgent = userAgent,
        });
        await _db.SaveChangesAsync(cancellationToken);

        var accessToken = _tokenService.GenerateAccessToken(user);
        var (rawRefresh, refreshHash) = _tokenService.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            Id        = Guid.NewGuid(),
            UserId    = user.Id,
            TokenHash = refreshHash,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(30),
            IpAddress = ip,
        };

        await _refreshTokens.AddAsync(refreshToken, cancellationToken);

        user.LastLoginAt = DateTimeOffset.UtcNow;
        await _users.UpdateAsync(user, cancellationToken);

        return Ok(new
        {
            accessToken,
            refreshToken = rawRefresh,
            expiresIn    = 3600,
            user         = MapUser(user),
        });
    }

    // POST /api/v1/auth/refresh
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(
        [FromBody] RefreshRequest request,
        CancellationToken cancellationToken)
    {
        var hash = ComputeHash(request.RefreshToken);
        var stored = await _refreshTokens.GetByHashAsync(hash, cancellationToken);

        if (stored is null || !stored.IsActive)
            return Unauthorized(new { code = "INVALID_REFRESH_TOKEN", message = "Refresh token inválido ou expirado." });

        // Rotation: revoke old, issue new
        stored.RevokedAt = DateTimeOffset.UtcNow;
        await _refreshTokens.UpdateAsync(stored, cancellationToken);

        var user = stored.User;
        if (!user.IsActive)
            return Unauthorized(new { code = "USER_INACTIVE", message = "Usuário inativo." });

        // Check if the user's tenant is still active
        if (user.TenantId.HasValue)
        {
            var tenant = await _tenants.GetByIdAsync(user.TenantId.Value, cancellationToken);
            if (tenant is null || !tenant.IsActive)
                return Unauthorized(new { code = "TENANT_INACTIVE", message = "Organização inativa." });
        }

        var newAccessToken = _tokenService.GenerateAccessToken(user);
        var (newRawRefresh, newRefreshHash) = _tokenService.GenerateRefreshToken();

        var newRefreshToken = new RefreshToken
        {
            Id        = Guid.NewGuid(),
            UserId    = user.Id,
            TokenHash = newRefreshHash,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(30),
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
        };
        await _refreshTokens.AddAsync(newRefreshToken, cancellationToken);

        return Ok(new
        {
            accessToken  = newAccessToken,
            refreshToken = newRawRefresh,
            expiresIn    = 3600,
        });
    }

    // POST /api/v1/auth/logout
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(
        [FromBody] RefreshRequest request,
        CancellationToken cancellationToken)
    {
        var hash   = ComputeHash(request.RefreshToken);
        var stored = await _refreshTokens.GetByHashAsync(hash, cancellationToken);

        if (stored is not null && stored.IsActive)
        {
            stored.RevokedAt = DateTimeOffset.UtcNow;
            await _refreshTokens.UpdateAsync(stored, cancellationToken);
        }

        return NoContent();
    }

    // GET /api/v1/auth/me
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var user = await _users.GetByIdAsync(userId, cancellationToken);
        if (user is null || !user.IsActive)
            return Unauthorized();

        // If user's tenant was deactivated, invalidate the session
        if (user.TenantId.HasValue)
        {
            var tenant = await _tenants.GetByIdAsync(user.TenantId.Value, cancellationToken);
            if (tenant is null || !tenant.IsActive)
                return Unauthorized();
        }

        return Ok(MapUser(user));
    }

    private static object MapUser(User u) => new
    {
        id          = u.Id,
        email       = u.Email,
        role        = u.Role.ToString(),
        tenantId    = u.TenantId,
        isActive    = u.IsActive,
        lastLoginAt = u.LastLoginAt,
        createdAt   = u.CreatedAt,
    };

    private static string ComputeHash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public record LoginRequest(string Email, string Password);
    public record RefreshRequest(string RefreshToken);
}
