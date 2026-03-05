using LifeTrigger.Engine.Domain.Entities;
using LifeTrigger.Engine.Domain.Requests;
using LifeTrigger.Engine.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace LifeTrigger.Engine.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<EvaluationRecord> Evaluations { get; set; }
    public DbSet<TenantSettings> TenantSettings { get; set; }
    public DbSet<IdempotencyKey> IdempotencyKeys { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Map TenantSettings
        modelBuilder.Entity<TenantSettings>(entity =>
        {
            entity.HasKey(t => t.TenantId);
            entity.ToTable("TenantSettings");
            entity.Property(t => t.MaxTotalCoverageMultiplier).HasPrecision(18, 2);
            entity.Property(t => t.MinCoverageAnnualIncomeMultiplier).HasPrecision(18, 2);
        });

        // Map EvaluationRecord
        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        modelBuilder.Entity<EvaluationRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("Evaluations");

            entity.Property(e => e.Request)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, jsonOptions),
                    v => JsonSerializer.Deserialize<LifeInsuranceAssessmentRequest>(v, jsonOptions)!
                )
                .HasColumnType("jsonb")
                .IsRequired();

            entity.Property(e => e.Result)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, jsonOptions),
                    v => JsonSerializer.Deserialize<LifeInsuranceAssessmentResult>(v, jsonOptions)!
                )
                .HasColumnType("jsonb")
                .IsRequired();

            entity.Property(e => e.Timestamp).IsRequired();
            entity.Property(e => e.EngineVersion).HasMaxLength(20);
            entity.Property(e => e.RuleSetVersion).HasMaxLength(20);
            entity.Property(e => e.AuditHash).HasMaxLength(64).IsRequired(false);

            // Coluna desnormalizada para filtragem eficiente por tenant (evita full-scan no JSONB)
            entity.Property<Guid?>("TenantId")
                .HasColumnName("TenantId")
                .IsRequired(false);

            // Identifica o corretor que criou a avaliação (filtragem por ownership)
            entity.Property(e => e.CreatedByUserId)
                .HasColumnName("CreatedByUserId")
                .IsRequired(false);

            entity.HasIndex("TenantId").HasDatabaseName("IX_Evaluations_TenantId");
            entity.HasIndex(e => e.CreatedByUserId).HasDatabaseName("IX_Evaluations_CreatedByUserId");
            entity.HasIndex(e => e.Timestamp).HasDatabaseName("IX_Evaluations_Timestamp");
        });

        // Map IdempotencyKey
        modelBuilder.Entity<IdempotencyKey>(entity =>
        {
            entity.HasKey(k => k.Key);
            entity.ToTable("IdempotencyKeys");
            entity.Property(k => k.Key).HasMaxLength(512).IsRequired();
            entity.Property(k => k.StatusCode).IsRequired();
            entity.Property(k => k.ResponseBody).IsRequired();
            entity.Property(k => k.ExpiresAt).IsRequired();
            entity.HasIndex(k => k.ExpiresAt).HasDatabaseName("IX_IdempotencyKeys_ExpiresAt");
        });
    }
}
