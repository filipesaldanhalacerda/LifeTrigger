using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeTrigger.Engine.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStatusNotesAndPartialConversion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StatusNotes",
                table: "Evaluations",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StatusNotes",
                table: "Evaluations");
        }
    }
}
