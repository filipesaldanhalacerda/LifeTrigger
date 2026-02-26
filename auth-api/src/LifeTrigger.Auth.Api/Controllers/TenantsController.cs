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

    public TenantsController(ITenantRepository tenants) => _tenants = tenants;

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
    [HttpGet("{id:guid}")]
    [Authorize(Policy = "TenantAdmin")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        // TenantAdmin can only see their own tenant; SuperAdmin sees any
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
