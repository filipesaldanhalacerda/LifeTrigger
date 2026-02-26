using LifeTrigger.Auth.Domain.Entities;
using LifeTrigger.Auth.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace LifeTrigger.Auth.Infrastructure.Data;

public class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Tenant>(b =>
        {
            b.ToTable("tenants");
            b.HasKey(t => t.Id);
            b.Property(t => t.Id).ValueGeneratedOnAdd();
            b.Property(t => t.Name).HasMaxLength(255).IsRequired();
            b.Property(t => t.Slug).HasMaxLength(100).IsRequired();
            b.HasIndex(t => t.Slug).IsUnique();
            b.Property(t => t.IsActive).IsRequired();
            b.Property(t => t.CreatedAt).IsRequired();
        });

        modelBuilder.Entity<User>(b =>
        {
            b.ToTable("users");
            b.HasKey(u => u.Id);
            b.Property(u => u.Id).ValueGeneratedOnAdd();
            b.Property(u => u.Email).HasMaxLength(255).IsRequired();
            b.HasIndex(u => u.Email).IsUnique();
            b.Property(u => u.PasswordHash).HasMaxLength(255).IsRequired();
            b.Property(u => u.Role)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();
            b.Property(u => u.TenantId);
            b.Property(u => u.IsActive).IsRequired();
            b.Property(u => u.CreatedAt).IsRequired();
            b.Property(u => u.LastLoginAt);
            b.HasIndex(u => u.TenantId);
            b.HasOne(u => u.Tenant)
                .WithMany(t => t.Users)
                .HasForeignKey(u => u.TenantId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RefreshToken>(b =>
        {
            b.ToTable("refresh_tokens");
            b.HasKey(r => r.Id);
            b.Property(r => r.Id).ValueGeneratedOnAdd();
            b.Property(r => r.UserId).IsRequired();
            b.Property(r => r.TokenHash).HasMaxLength(128).IsRequired();
            b.HasIndex(r => r.TokenHash).IsUnique();
            b.HasIndex(r => r.UserId);
            b.HasIndex(r => r.ExpiresAt);
            b.Property(r => r.ExpiresAt).IsRequired();
            b.Property(r => r.RevokedAt);
            b.Property(r => r.CreatedAt).IsRequired();
            b.Property(r => r.IpAddress).HasMaxLength(45);
            b.Ignore(r => r.IsExpired);
            b.Ignore(r => r.IsRevoked);
            b.Ignore(r => r.IsActive);
            b.HasOne(r => r.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
