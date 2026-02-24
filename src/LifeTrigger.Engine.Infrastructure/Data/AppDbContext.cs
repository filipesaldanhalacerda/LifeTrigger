using LifeTrigger.Engine.Domain.Entities;
using LifeTrigger.Engine.Domain.Requests;
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
        modelBuilder.Entity<EvaluationRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("Evaluations");

            // We serialize complex domain request/responses into JSON strings inside specific SQL Columns
            // Doing this saves us from creating 20 child tables for "PersonalContext", "FamilyContext", "Debts", etc.
            
            var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

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
                
            entity.Property(e => e.Timestamp)
                .IsRequired();
                
            entity.Property(e => e.EngineVersion)
                .HasMaxLength(20);
                
            entity.Property(e => e.RuleSetVersion)
                .HasMaxLength(20);
        });
    }
}
