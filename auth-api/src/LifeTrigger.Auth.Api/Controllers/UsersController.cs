using System.Security.Claims;
using LifeTrigger.Auth.Application.Interfaces;
using LifeTrigger.Auth.Domain.Entities;
using LifeTrigger.Auth.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LifeTrigger.Auth.Api.Controllers;

[ApiController]
[Route("api/v1/users")]
[Authorize(Policy = "Manager")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IRefreshTokenRepository _refreshTokens;

    public UsersController(IUserRepository users, IRefreshTokenRepository refreshTokens)
    {
        _users         = users;
        _refreshTokens = refreshTokens;
    }

    // POST /api/v1/users
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        var callerRole = GetCurrentRole();

        // Non-SuperAdmin can only create users in their own tenant
        if (callerRole != UserRole.SuperAdmin)
        {
            var myTenantId = GetCurrentTenantId();
            if (request.TenantId != myTenantId)
                return Forbid();
        }

        var existing = await _users.GetByEmailAsync(request.Email, cancellationToken);
        if (existing is not null)
            return Conflict(new { code = "EMAIL_TAKEN", message = "E-mail já cadastrado." });

        if (!Enum.TryParse<UserRole>(request.Role, ignoreCase: true, out var targetRole))
            return BadRequest(new { code = "INVALID_ROLE", message = $"Role '{request.Role}' inválida." });

        // Enforce role ceiling: callers cannot create users with equal or higher privilege
        if (!CanAssignRole(callerRole, targetRole))
            return Forbid();

        var user = new User
        {
            Id           = Guid.NewGuid(),
            Email        = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role         = targetRole,
            TenantId     = request.TenantId,
            IsActive     = true,
        };

        await _users.AddAsync(user, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, MapUser(user));
    }

    // GET /api/v1/users
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        IReadOnlyList<User> users;
        if (GetCurrentRole() == UserRole.SuperAdmin)
            users = await _users.GetAllAsync(cancellationToken);
        else
        {
            var tenantId = GetCurrentTenantId();
            if (tenantId is null) return Forbid();
            users = await _users.GetByTenantAsync(tenantId.Value, cancellationToken);
        }

        return Ok(users.Select(MapUser));
    }

    // GET /api/v1/users/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(id, cancellationToken);
        if (user is null) return NotFound();
        if (!CanAccessUser(user)) return Forbid();

        return Ok(MapUser(user));
    }

    // PATCH /api/v1/users/{id}
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(id, cancellationToken);
        if (user is null) return NotFound();
        if (!CanAccessUser(user)) return Forbid();

        if (request.Role is not null)
        {
            if (!Enum.TryParse<UserRole>(request.Role, ignoreCase: true, out var targetRole))
                return BadRequest(new { code = "INVALID_ROLE", message = $"Role '{request.Role}' inválida." });

            if (!CanAssignRole(GetCurrentRole(), targetRole))
                return Forbid();

            user.Role = targetRole;
        }

        await _users.UpdateAsync(user, cancellationToken);
        return Ok(MapUser(user));
    }

    // PATCH /api/v1/users/{id}/status
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateStatusRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(id, cancellationToken);
        if (user is null) return NotFound();
        if (!CanAccessUser(user)) return Forbid();

        user.IsActive = request.IsActive;
        if (!request.IsActive)
            await _refreshTokens.RevokeAllForUserAsync(user.Id, cancellationToken);

        await _users.UpdateAsync(user, cancellationToken);
        return Ok(MapUser(user));
    }

    // POST /api/v1/users/{id}/reset-password
    [HttpPost("{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(
        Guid id,
        [FromBody] ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(id, cancellationToken);
        if (user is null) return NotFound();
        if (!CanAccessUser(user)) return Forbid();

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _refreshTokens.RevokeAllForUserAsync(user.Id, cancellationToken);
        await _users.UpdateAsync(user, cancellationToken);

        return NoContent();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private UserRole GetCurrentRole()
    {
        var val = User.FindFirstValue("role");
        return Enum.TryParse<UserRole>(val, out var role) ? role : UserRole.Viewer;
    }

    private Guid? GetCurrentTenantId()
    {
        var val = User.FindFirstValue("tenantId");
        return Guid.TryParse(val, out var id) ? id : null;
    }

    private bool CanAccessUser(User user)
    {
        if (GetCurrentRole() == UserRole.SuperAdmin) return true;
        var myTenantId = GetCurrentTenantId();
        return user.TenantId.HasValue && user.TenantId == myTenantId;
    }

    /// <summary>
    /// A caller can only assign roles strictly below their own level.
    /// SuperAdmin=5, TenantOwner=4, Manager=3, Broker=2, Viewer=1
    /// </summary>
    private static bool CanAssignRole(UserRole callerRole, UserRole targetRole)
    {
        int callerLevel = RoleLevel(callerRole);
        int targetLevel = RoleLevel(targetRole);
        return callerLevel > targetLevel;
    }

    private static int RoleLevel(UserRole role) => role switch
    {
        UserRole.SuperAdmin  => 5,
        UserRole.TenantOwner => 4,
        UserRole.Manager     => 3,
        UserRole.Broker      => 2,
        UserRole.Viewer      => 1,
        _                    => 0,
    };

    private static object MapUser(User u) => new
    {
        id          = u.Id,
        email       = u.Email,
        role        = u.Role.ToString(),
        tenantId    = u.TenantId,
        isActive    = u.IsActive,
        createdAt   = u.CreatedAt,
        lastLoginAt = u.LastLoginAt,
    };

    public record CreateUserRequest(string Email, string Password, string Role, Guid? TenantId);
    public record UpdateUserRequest(string? Role);
    public record UpdateStatusRequest(bool IsActive);
    public record ResetPasswordRequest(string NewPassword);
}
