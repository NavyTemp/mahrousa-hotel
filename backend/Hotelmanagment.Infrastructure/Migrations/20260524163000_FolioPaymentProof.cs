using Hotelmanagment.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hotelmanagment.Infrastructure.Migrations
{
    [DbContext(typeof(HotelDbContext))]
    [Migration("20260524163000_FolioPaymentProof")]
    public partial class FolioPaymentProof : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaymentProofPath",
                table: "GuestFolios",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentProofPath",
                table: "GuestFolios");
        }
    }
}
