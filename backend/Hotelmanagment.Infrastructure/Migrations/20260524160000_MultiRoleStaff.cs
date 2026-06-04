using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hotelmanagment.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MultiRoleStaff : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StaffRoles",
                columns: table => new
                {
                    StaffId = table.Column<int>(type: "integer", nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffRoles", x => new { x.StaffId, x.Role });
                    table.ForeignKey(
                        name: "FK_StaffRoles_Staff_StaffId",
                        column: x => x.StaffId,
                        principalTable: "Staff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Backfill any existing single-role assignments into the new junction table.
            migrationBuilder.Sql(@"
                INSERT INTO ""StaffRoles"" (""StaffId"", ""Role"")
                SELECT ""Id"", ""Role"" FROM ""Staff""
                ON CONFLICT DO NOTHING;
            ");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Staff");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Staff",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Admin");

            // Best-effort: pick the first role per staff to restore the legacy single-column.
            migrationBuilder.Sql(@"
                UPDATE ""Staff"" s
                SET ""Role"" = sub.""Role""
                FROM (
                    SELECT DISTINCT ON (""StaffId"") ""StaffId"", ""Role""
                    FROM ""StaffRoles""
                    ORDER BY ""StaffId"", ""Role""
                ) sub
                WHERE s.""Id"" = sub.""StaffId"";
            ");

            migrationBuilder.DropTable(
                name: "StaffRoles");
        }
    }
}
