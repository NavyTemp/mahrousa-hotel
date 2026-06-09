using System.Net;
using Hotelmanagment.Application.DTOs.Folio;
using Hotelmanagment.Application.DTOs.Reservations;
using Hotelmanagment.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Hotelmanagment.IntegrationTests.Restaurant;

public class RestaurantControllerTests : IntegrationTestBase
{
    public RestaurantControllerTests(HotelApiFactory factory) : base(factory) { }

    private async Task<string> CheckInAndReturnRoomAsync()
    {
        var reception = await ClientAsAsync(TestAccounts.Reception);
        var roomNumber = await WithDbAsync(async db =>
            (await db.Rooms.FirstAsync()).RoomNumber);
        var roomId = await WithDbAsync(async db =>
            (await db.Rooms.FirstAsync(r => r.RoomNumber == roomNumber)).Id);
        await reception.PostAsJsonAsync("/api/reservations/checkin",
            new CheckInRequest("R", "+1", null, roomId,
                DateTime.UtcNow.AddDays(2), null, null));
        return roomNumber;
    }

    [Fact]
    public async Task AddCharge_AsRestaurant_AppendsLineToFolio()
    {
        var room = await CheckInAndReturnRoomAsync();
        var rest = await ClientAsAsync(TestAccounts.Restaurant);

        var resp = await rest.PostAsJsonAsync("/api/restaurant/charge",
            new AddRestaurantChargeRequest(room, "Dinner", 42.75m));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var addedAmount = await WithDbAsync(async db =>
            await db.FolioLines.Where(l => l.Description == "Dinner").SumAsync(l => l.Amount));
        addedAmount.Should().Be(42.75m);
    }

    [Fact]
    public async Task AddCharge_AsReception_Returns_403()
    {
        var room = await CheckInAndReturnRoomAsync();
        var client = await ClientAsAsync(TestAccounts.Reception);

        var resp = await client.PostAsJsonAsync("/api/restaurant/charge",
            new AddRestaurantChargeRequest(room, "Lunch", 10m));

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AddCharge_UnknownRoom_Returns_404()
    {
        var client = await ClientAsAsync(TestAccounts.Restaurant);

        var resp = await client.PostAsJsonAsync("/api/restaurant/charge",
            new AddRestaurantChargeRequest("9999", "Lunch", 10m));

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task AddCharge_NonPositiveAmount_Returns_400()
    {
        var room = await CheckInAndReturnRoomAsync();
        var client = await ClientAsAsync(TestAccounts.Restaurant);

        var resp = await client.PostAsJsonAsync("/api/restaurant/charge",
            new AddRestaurantChargeRequest(room, "Free", 0m));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
