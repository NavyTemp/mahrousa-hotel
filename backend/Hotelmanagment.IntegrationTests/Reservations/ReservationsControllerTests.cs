using System.Net;
using Hotelmanagment.Application.DTOs.Reservations;
using Hotelmanagment.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Hotelmanagment.IntegrationTests.Reservations;

public class ReservationsControllerTests : IntegrationTestBase
{
    public ReservationsControllerTests(HotelApiFactory factory) : base(factory) { }

    [Fact]
    public async Task PhoneBooking_AsReception_Returns_201()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);

        var resp = await client.PostAsJsonAsync("/api/reservations/phone",
            new PhoneReservationRequest(
                "Phone Guest", "+1 555 0001",
                DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(3)));

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var dto = await resp.ReadJsonAsync<ReservationDto>();
        dto.Status.Should().Be("Pending");
        dto.Source.Should().Be("Phone");
    }

    [Fact]
    public async Task PhoneBooking_AsCashier_Returns_403()
    {
        var client = await ClientAsAsync(TestAccounts.Cashier);

        var resp = await client.PostAsJsonAsync("/api/reservations/phone",
            new PhoneReservationRequest(
                "X", "+1", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(2)));

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task WalkInCheckIn_AsReception_Marks_RoomOccupied_AndCreatesFolio()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var roomId = await WithDbAsync(async db =>
            (await db.Rooms.FirstAsync(r => r.RoomNumber == "101")).Id);

        var resp = await client.PostAsJsonAsync("/api/reservations/checkin",
            new CheckInRequest(
                "Alice Walk", "+1 555 0010", "ID-1",
                roomId, DateTime.UtcNow.AddDays(2), null, null));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        await WithDbAsync(async db =>
        {
            (await db.Rooms.FindAsync(roomId))!.Status.ToString().Should().Be("Occupied");
            (await db.GuestFolios.CountAsync()).Should().Be(1);
        });
    }

    [Fact]
    public async Task CheckIn_OccupiedRoom_Returns_400()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var roomId = await WithDbAsync(async db => (await db.Rooms.FirstAsync()).Id);

        await client.PostAsJsonAsync("/api/reservations/checkin", new CheckInRequest(
            "A", "+1", null, roomId, DateTime.UtcNow.AddDays(1), null, null));

        var second = await client.PostAsJsonAsync("/api/reservations/checkin",
            new CheckInRequest("B", "+2", null, roomId, DateTime.UtcNow.AddDays(1), null, null));

        second.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetActive_AsReception_Returns_OnlyPendingAndCheckedIn()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var roomId = await WithDbAsync(async db => (await db.Rooms.FirstAsync()).Id);

        await client.PostAsJsonAsync("/api/reservations/phone",
            new PhoneReservationRequest("P1", "+1",
                DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(2)));
        await client.PostAsJsonAsync("/api/reservations/checkin",
            new CheckInRequest("W1", "+2", null, roomId, DateTime.UtcNow.AddDays(3), null, null));

        var listResp = await client.GetAsync("/api/reservations");
        var list = await listResp.ReadJsonAsync<List<ReservationDto>>();
        list.Should().HaveCount(2);
        list.Select(r => r.Status).Should().OnlyContain(s => s == "Pending" || s == "CheckedIn");
    }
}
