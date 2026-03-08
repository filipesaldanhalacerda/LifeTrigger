using System.Security.Claims;

namespace LifeTrigger.Engine.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid? GetTenantId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("tenantId");
        return Guid.TryParse(value, out var id) ? id : null;
    }

    public static Guid? GetUserId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? user.FindFirstValue("sub");
        return Guid.TryParse(value, out var id) ? id : null;
    }

    public static string? GetRole(this ClaimsPrincipal user)
        => user.FindFirstValue("role");
}
