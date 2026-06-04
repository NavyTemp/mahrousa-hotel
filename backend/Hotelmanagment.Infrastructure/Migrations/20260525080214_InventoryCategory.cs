using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hotelmanagment.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InventoryCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add the column with a placeholder default for legacy rows; the
            // SeedData routine that runs on startup will immediately backfill
            // each item with its correct category by name.
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "InventoryItems",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "SelfCare");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "InventoryItems");
        }
    }
}
