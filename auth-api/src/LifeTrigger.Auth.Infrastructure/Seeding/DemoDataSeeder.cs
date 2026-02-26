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

    public static async Task SeedAsync(AuthDbContext context, ILogger logger)
    {
        // Idempotency guard — skip if any user already exists
        if (await context.Users.AnyAsync())
        {
            logger.LogInformation("Auth demo data already seeded, skipping.");
            return;
        }

        // ─── Tenants ────────────────────────────────────────────────────────────
        var alpha = new Tenant { Id = AlphaTenantId, Name = "DEMO_CORRETORA_ALPHA", Slug = "demo-alpha" };
        var beta  = new Tenant { Id = BetaTenantId,  Name = "DEMO_EMPRESA_BETA",    Slug = "demo-beta"  };
        context.Tenants.AddRange(alpha, beta);

        // ─── SuperAdmin ─────────────────────────────────────────────────────────
        var superAdmin = new User
        {
            Id           = Guid.NewGuid(),
            Email        = "superadmin@lifetrigger.io",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Super@123!"),
            Role         = UserRole.SuperAdmin,
            TenantId     = null,
        };

        // ─── Alpha users ────────────────────────────────────────────────────────
        var alphaAdmin = new User
        {
            Id           = Guid.NewGuid(),
            Email        = "admin@alpha.demo",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Alpha@123!"),
            Role         = UserRole.TenantAdmin,
            TenantId     = AlphaTenantId,
        };
        var alphaPartner = new User
        {
            Id           = Guid.NewGuid(),
            Email        = "partner@alpha.demo",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Alpha@123!"),
            Role         = UserRole.Partner,
            TenantId     = AlphaTenantId,
        };

        // ─── Beta users ─────────────────────────────────────────────────────────
        var betaAdmin = new User
        {
            Id           = Guid.NewGuid(),
            Email        = "admin@beta.demo",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Beta@123!"),
            Role         = UserRole.TenantAdmin,
            TenantId     = BetaTenantId,
        };
        var betaPartner = new User
        {
            Id           = Guid.NewGuid(),
            Email        = "partner@beta.demo",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Beta@123!"),
            Role         = UserRole.Partner,
            TenantId     = BetaTenantId,
        };

        context.Users.AddRange(superAdmin, alphaAdmin, alphaPartner, betaAdmin, betaPartner);
        await context.SaveChangesAsync();

        logger.LogInformation(
            "Auth demo data seeded: 2 tenants, 5 users (1 SuperAdmin, 2 TenantAdmin, 2 Partner).");
    }
}
