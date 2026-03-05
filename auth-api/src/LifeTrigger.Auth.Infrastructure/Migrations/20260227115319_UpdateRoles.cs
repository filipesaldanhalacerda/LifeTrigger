using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LifeTrigger.Auth.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Rename existing roles to match new UserRole enum values
            migrationBuilder.Sql("UPDATE users SET \"Role\" = 'Manager'     WHERE \"Role\" = 'TenantAdmin';");
            migrationBuilder.Sql("UPDATE users SET \"Role\" = 'Broker'      WHERE \"Role\" = 'Partner';");
            migrationBuilder.Sql("UPDATE users SET \"Role\" = 'Viewer'      WHERE \"Role\" = 'ReadOnly';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE users SET \"Role\" = 'TenantAdmin' WHERE \"Role\" = 'Manager';");
            migrationBuilder.Sql("UPDATE users SET \"Role\" = 'Partner'     WHERE \"Role\" = 'Broker';");
            migrationBuilder.Sql("UPDATE users SET \"Role\" = 'ReadOnly'    WHERE \"Role\" = 'Viewer';");
        }
    }
}
