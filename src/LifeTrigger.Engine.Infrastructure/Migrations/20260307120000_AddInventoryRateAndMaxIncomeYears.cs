using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeTrigger.Engine.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryRateAndMaxIncomeYears : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "InventoryRate",
                table: "TenantSettings",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0.10m);

            migrationBuilder.AddColumn<int>(
                name: "MaxIncomeReplacementYears",
                table: "TenantSettings",
                type: "integer",
                nullable: false,
                defaultValue: 10);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InventoryRate",
                table: "TenantSettings");

            migrationBuilder.DropColumn(
                name: "MaxIncomeReplacementYears",
                table: "TenantSettings");
        }
    }
}
