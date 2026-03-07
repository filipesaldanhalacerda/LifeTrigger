using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeTrigger.Engine.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEvaluationStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Evaluations",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "Evaluations");
        }
    }
}
