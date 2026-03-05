using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeTrigger.Engine.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCreatedByUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "Evaluations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Evaluations_CreatedByUserId",
                table: "Evaluations",
                column: "CreatedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Evaluations_CreatedByUserId",
                table: "Evaluations");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Evaluations");
        }
    }
}
