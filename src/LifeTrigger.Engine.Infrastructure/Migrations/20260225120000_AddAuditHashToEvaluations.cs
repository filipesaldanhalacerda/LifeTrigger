using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeTrigger.Engine.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditHashToEvaluations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AuditHash",
                table: "Evaluations",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AuditHash",
                table: "Evaluations");
        }
    }
}
