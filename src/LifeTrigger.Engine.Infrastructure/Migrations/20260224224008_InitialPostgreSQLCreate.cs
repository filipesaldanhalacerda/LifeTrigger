using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeTrigger.Engine.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialPostgreSQLCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Evaluations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Timestamp = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EngineVersion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RuleSetVersion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Request = table.Column<string>(type: "jsonb", nullable: false),
                    Result = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Evaluations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TenantSettings",
                columns: table => new
                {
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    IncomeReplacementYearsSingle = table.Column<int>(type: "integer", nullable: false),
                    IncomeReplacementYearsWithDependents = table.Column<int>(type: "integer", nullable: false),
                    EmergencyFundBufferMonths = table.Column<int>(type: "integer", nullable: false),
                    MaxTotalCoverageMultiplier = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    MinCoverageAnnualIncomeMultiplier = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantSettings", x => x.TenantId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Evaluations");

            migrationBuilder.DropTable(
                name: "TenantSettings");
        }
    }
}
