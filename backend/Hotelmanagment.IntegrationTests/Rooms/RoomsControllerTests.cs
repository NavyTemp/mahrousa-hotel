using System.Net;
using Hotelmanagment.Application.DTOs.Rooms;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Hotelmanagment.IntegrationTests.Rooms;

public class RoomsControllerTests : IntegrationTestBase
{
    public RoomsControllerTests(HotelApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetAll_AnyAuthenticatedUser_Succeeds()
    {
        var client = await ClientAsAsync(TestAccounts.Cashier);

        var resp = await client.GetAsync("/api/rooms");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var rooms = await resp.ReadJsonAsync<List<RoomDto>>();
        rooms.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetAll_Anonymous_Returns_401()
    {
        var resp = await AnonymousClient().GetAsync("/api/rooms");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UpdateStatus_AsRoomService_Available_To_Maintenance_Succeeds()
    {
        var client = await ClientAsAsync(TestAccounts.RoomService);
        var room = await WithDbAsync(async db =>
            await db.Rooms.FirstAsync(r => r.Status == RoomStatus.Available));

        var resp = await client.PatchAsJsonAsync($"/api/rooms/{room.Id}/status",
            new UpdateRoomStatusRequest("Maintenance"));

        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task UpdateStatus_Available_To_Occupied_Returns_400()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);
        var roomId = await WithDbAsync(async db => (await db.Rooms.FirstAsync()).Id);

        var resp = await client.PatchAsJsonAsync($"/api/rooms/{roomId}/status",
            new UpdateRoomStatusRequest("Occupied"));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resp.ReadErrorMessageAsync()).Should().Contain("Cannot transition");
    }

    [Fact]
    public async Task UpdateStatus_AsReception_Returns_403()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var roomId = await WithDbAsync(async db => (await db.Rooms.FirstAsync()).Id);

        var resp = await client.PatchAsJsonAsync($"/api/rooms/{roomId}/status",
            new UpdateRoomStatusRequest("Maintenance"));

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateStatus_UnknownRoom_Returns_404()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);

        var resp = await client.PatchAsJsonAsync("/api/rooms/9999/status",
            new UpdateRoomStatusRequest("Maintenance"));

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
