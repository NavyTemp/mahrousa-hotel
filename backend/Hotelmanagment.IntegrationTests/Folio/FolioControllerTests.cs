using System.Net;
using System.Net.Http.Headers;
using Hotelmanagment.Application.DTOs.Folio;
using Hotelmanagment.Application.DTOs.Reservations;
using Hotelmanagment.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Hotelmanagment.IntegrationTests.Folio;

public class FolioControllerTests : IntegrationTestBase
{
    public FolioControllerTests(HotelApiFactory factory) : base(factory) { }

    private async Task<(int reservationId, string roomNumber)> CheckInAGuestAsync(HttpClient client)
    {
        var roomNumber = await WithDbAsync(async db =>
            (await db.Rooms.FirstAsync()).RoomNumber);
        var roomId = await WithDbAsync(async db =>
            (await db.Rooms.FirstAsync(r => r.RoomNumber == roomNumber)).Id);

        var resp = await client.PostAsJsonAsync("/api/reservations/checkin",
            new CheckInRequest("Folio Guest", "+1", null,
                roomId, DateTime.UtcNow.AddDays(2), null, null));
        resp.EnsureSuccessStatusCode();
        var dto = await resp.ReadJsonAsync<ReservationDto>();
        return (dto.Id, roomNumber);
    }

    [Fact]
    public async Task GetByRoom_AsReception_Returns_FolioWithLines()
    {
        var reception = await ClientAsAsync(TestAccounts.Reception);
        var (_, roomNumber) = await CheckInAGuestAsync(reception);

        var resp = await reception.GetAsync($"/api/folio/room/{roomNumber}");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var folio = await resp.ReadJsonAsync<FolioDto>();
        folio.Lines.Should().HaveCountGreaterThan(0);
        folio.RoomNumber.Should().Be(roomNumber);
    }

    [Fact]
    public async Task GetByRoom_Unknown_Returns_404()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);

        var resp = await client.GetAsync("/api/folio/room/9999");

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetByGuest_AsRoomService_Returns_403()
    {
        var client = await ClientAsAsync(TestAccounts.RoomService);

        var resp = await client.GetAsync("/api/folio/guest/1");

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ConfirmPayment_WithoutFile_Returns_400()
    {
        var reception = await ClientAsAsync(TestAccounts.Reception);
        var (resId, _) = await CheckInAGuestAsync(reception);
        var folioId = await WithDbAsync(async db =>
            (await db.GuestFolios.FirstAsync(f => f.ReservationId == resId)).Id);

        var cashier = await ClientAsAsync(TestAccounts.Cashier);
        var form = new MultipartFormDataContent();
        var resp = await cashier.PostAsync($"/api/folio/{folioId}/confirm-payment", form);

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ConfirmPayment_WithFile_MarksFolioPaid_And_RoomDirty()
    {
        var reception = await ClientAsAsync(TestAccounts.Reception);
        var (resId, roomNumber) = await CheckInAGuestAsync(reception);
        var folioId = await WithDbAsync(async db =>
            (await db.GuestFolios.FirstAsync(f => f.ReservationId == resId)).Id);

        var cashier = await ClientAsAsync(TestAccounts.Cashier);
        var form = new MultipartFormDataContent();
        var bytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 }; // JPEG header bytes
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        form.Add(file, "proof", "receipt.jpg");

        var resp = await cashier.PostAsync($"/api/folio/{folioId}/confirm-payment", form);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        await WithDbAsync(async db =>
        {
            (await db.GuestFolios.FindAsync(folioId))!.IsPaid.Should().BeTrue();
            (await db.Rooms.FirstAsync(r => r.RoomNumber == roomNumber)).Status.ToString().Should().Be("Dirty");
        });
    }

    [Fact]
    public async Task ConfirmPayment_AsReception_Returns_403()
    {
        var reception = await ClientAsAsync(TestAccounts.Reception);
        var (resId, _) = await CheckInAGuestAsync(reception);
        var folioId = await WithDbAsync(async db =>
            (await db.GuestFolios.FirstAsync(f => f.ReservationId == resId)).Id);

        var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(new byte[] { 1, 2, 3 }), "proof", "p.jpg");
        var resp = await reception.PostAsync($"/api/folio/{folioId}/confirm-payment", form);

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
