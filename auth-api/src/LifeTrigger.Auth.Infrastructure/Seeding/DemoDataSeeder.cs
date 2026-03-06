using BCrypt.Net;
using LifeTrigger.Auth.Domain.Entities;
using LifeTrigger.Auth.Domain.Enums;
using LifeTrigger.Auth.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LifeTrigger.Auth.Infrastructure.Seeding;

public static class DemoDataSeeder
{
    private static readonly Guid AlphaTenantId = Guid.Parse("A1A1A1A1-A1A1-A1A1-A1A1-A1A1A1A1A1A1");
    private static readonly Guid BetaTenantId  = Guid.Parse("B2B2B2B2-B2B2-B2B2-B2B2-B2B2B2B2B2B2");

    // Canonical demo users — checked individually by email for idempotency
    private static readonly (string Email, string Password, UserRole Role, Guid? TenantId)[] DemoUsers =
    [
        ("superadmin@lifetrigger.io", "Super@123!", UserRole.SuperAdmin,  null),
        ("owner@alpha.demo",          "Alpha@123!", UserRole.TenantOwner, AlphaTenantId),
        ("manager@alpha.demo",        "Alpha@123!", UserRole.Manager,     AlphaTenantId),
        ("broker@alpha.demo",         "Alpha@123!", UserRole.Broker,      AlphaTenantId),
        ("viewer@alpha.demo",         "Alpha@123!", UserRole.Viewer,      AlphaTenantId),
        ("owner@beta.demo",           "Beta@123!",  UserRole.TenantOwner, BetaTenantId),
        ("manager@beta.demo",         "Beta@123!",  UserRole.Manager,     BetaTenantId),
        ("broker@beta.demo",          "Beta@123!",  UserRole.Broker,      BetaTenantId),
    ];

    // Emails that belong exclusively to demo tenants — any others are stale and must be removed
    private static readonly HashSet<string> CanonicalEmails =
        new(DemoUsers.Select(u => u.Email), StringComparer.OrdinalIgnoreCase);

    public static async Task SeedAsync(AuthDbContext context, ILogger logger)
    {
        // ─── Tenants — upsert by ID ──────────────────────────────────────────────
        var existingTenantIds = await context.Tenants
            .Select(t => t.Id)
            .ToListAsync();

        if (!existingTenantIds.Contains(AlphaTenantId))
            context.Tenants.Add(new Tenant { Id = AlphaTenantId, Name = "DEMO_CORRETORA_ALPHA", Slug = "demo-alpha" });

        if (!existingTenantIds.Contains(BetaTenantId))
            context.Tenants.Add(new Tenant { Id = BetaTenantId, Name = "DEMO_EMPRESA_BETA", Slug = "demo-beta" });

        await context.SaveChangesAsync();

        // ─── Remove stale demo users — scoped to demo tenant IDs only ────────────
        // Any user belonging to Alpha/Beta demo that is NOT in the canonical list
        // (e.g. admin@alpha.demo, partner@alpha.demo) is a leftover from a previous
        // role naming scheme and must be deleted.
        var stale = await context.Users
            .Where(u => (u.TenantId == AlphaTenantId || u.TenantId == BetaTenantId)
                        && !CanonicalEmails.Contains(u.Email))
            .ToListAsync();

        // Also remove a stale superadmin with an unexpected email (safety net)
        var staleSuperAdmin = await context.Users
            .Where(u => u.TenantId == null
                        && u.Role == UserRole.SuperAdmin
                        && !CanonicalEmails.Contains(u.Email))
            .ToListAsync();

        var toDelete = stale.Concat(staleSuperAdmin).ToList();
        if (toDelete.Count > 0)
        {
            context.Users.RemoveRange(toDelete);
            await context.SaveChangesAsync();
            logger.LogInformation(
                "Auth demo cleanup: {Count} stale user(s) removed ({Emails}).",
                toDelete.Count,
                string.Join(", ", toDelete.Select(u => u.Email)));
        }

        // ─── Create missing canonical users ──────────────────────────────────────
        var existingEmails = await context.Users
            .Select(u => u.Email)
            .ToListAsync();

        int created = 0;
        foreach (var (email, password, role, tenantId) in DemoUsers)
        {
            if (existingEmails.Contains(email))
                continue;

            context.Users.Add(new User
            {
                Id           = Guid.NewGuid(),
                Email        = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 4),
                Role         = role,
                TenantId     = tenantId,
            });
            created++;
        }

        if (created > 0)
        {
            await context.SaveChangesAsync();
            logger.LogInformation("Auth demo data seeded: {Count} new user(s) created.", created);
        }
        else
        {
            logger.LogInformation("Auth demo data already up to date, no new users created.");
        }
    }
}
