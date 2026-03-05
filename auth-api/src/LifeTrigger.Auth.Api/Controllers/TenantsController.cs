using System.Security.Claims;
using LifeTrigger.Auth.Application.Interfaces;
using LifeTrigger.Auth.Domain.Entities;
using LifeTrigger.Auth.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LifeTrigger.Auth.Api.Controllers;

[ApiController]
[Route("api/v1/tenants")]
[Authorize]
public class TenantsController : ControllerBase
{
    private readonly ITenantRepository _tenants;
    private readonly IUserRepository _users;
    private readonly IRefreshTokenRepository _refreshTokens;

    public TenantsController(
        ITenantRepository tenants,
        IUserRepository users,
        IRefreshTokenRepository refreshTokens)
    {
        _tenants       = tenants;
        _users         = users;
        _refreshTokens = refreshTokens;
    }

    // POST /api/v1/tenants
    [HttpPost]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> Create(
        [FromBody] CreateTenantRequest request,
        CancellationToken cancellationToken)
    {
        var existing = await _tenants.GetBySlugAsync(request.Slug, cancellationToken);
        if (existing is not null)
            return Conflict(new { code = "SLUG_TAKEN", message = $"Slug '{request.Slug}' já está em uso." });

        var tenant = new Tenant
        {
            Id        = Guid.NewGuid(),
            Name      = request.Name,
            Slug      = request.Slug.ToLowerInvariant(),
            IsActive  = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        await _tenants.AddAsync(tenant, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = tenant.Id }, MapTenant(tenant));
    }

    // GET /api/v1/tenants
    [HttpGet]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var tenants = await _tenants.GetAllAsync(cancellationToken);
        return Ok(tenants.Select(MapTenant));
    }

    // GET /api/v1/tenants/{id}
    // Any authenticated user may read their own tenant (needed for UI display).
    // Non-SuperAdmin users are blocked from reading any other tenant by the guard below.
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        // Non-SuperAdmin users can only read their own tenant.
        if (!IsSuperAdmin() && GetCurrentTenantId() != id)
            return Forbid();

        var tenant = await _tenants.GetByIdAsync(id, cancellationToken);
        return tenant is null ? NotFound() : Ok(MapTenant(tenant));
    }

    // PATCH /api/v1/tenants/{id}/status
    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = "SuperAdmin")]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateStatusRequest request,
        CancellationToken cancellationToken)
    {
        var tenant = await _tenants.GetByIdAsync(id, cancellationToken);
        if (tenant is null) return NotFound();

        tenant.IsActive = request.IsActive;
        await _tenants.UpdateAsync(tenant, cancellationToken);

        // When deactivating a tenant, revoke all active sessions for every user in it.
        // This prevents users from renewing their tokens — existing access tokens
        // will remain valid until they expire naturally (≤1 hour).
        if (!request.IsActive)
        {
            var tenantUsers = await _users.GetByTenantAsync(id, cancellationToken);
            foreach (var user in tenantUsers)
                await _refreshTokens.RevokeAllForUserAsync(user.Id, cancellationToken);
        }

        return Ok(MapTenant(tenant));
    }

    private bool IsSuperAdmin()
        => User.FindFirstValue("role") == nameof(UserRole.SuperAdmin);

    private Guid? GetCurrentTenantId()
    {
        var val = User.FindFirstValue("tenantId");
        return Guid.TryParse(val, out var id) ? id : null;
    }

    private static object MapTenant(Tenant t) => new
    {
        id        = t.Id,
        name      = t.Name,
        slug      = t.Slug,
        isActive  = t.IsActive,
        createdAt = t.CreatedAt,
    };

    public record CreateTenantRequest(string Name, string Slug);
    public record UpdateStatusRequest(bool IsActive);
}
