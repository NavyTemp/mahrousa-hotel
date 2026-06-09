using System.Net;
using Hotelmanagment.Application.DTOs.Halls;
using Hotelmanagment.IntegrationTests.Infrastructure;

namespace Hotelmanagment.IntegrationTests.Halls;

public class HallsControllerTests : IntegrationTestBase
{
    public HallsControllerTests(HotelApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetAll_AsReception_Returns_SeededHalls()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);

        var resp = await client.GetAsync("/api/halls");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var halls = await resp.ReadJsonAsync<List<HallDto>>();
        halls.Should().NotBeEmpty();
        halls.Select(h => h.Name).Should().Contain("Grand Ballroom");
    }

    [Fact]
    public async Task GetAll_AsCashier_Returns_403()
    {
        var client = await ClientAsAsync(TestAccounts.Cashier);

        var resp = await client.GetAsync("/api/halls");

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetAvailable_ReturnsHallsWithoutOverlappingBookings()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);

        var start = DateTime.UtcNow.AddDays(2).ToString("o");
        var end   = DateTime.UtcNow.AddDays(2).AddHours(3).ToString("o");

        var resp = await client.GetAsync($"/api/halls/available?start={start}&end={end}");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var halls = await resp.ReadJsonAsync<List<HallDto>>();
        halls.Should().NotBeEmpty();
    }

    [Fact]
    public async Task UpdateStatus_AsRoomService_Succeeds()
    {
        var client = await ClientAsAsync(TestAccounts.RoomService);
        var hallId = await WithDbAsync(async db => (await db.Halls.FirstAsync()).Id);

        var resp = await client.PatchAsJsonAsync($"/api/halls/{hallId}/status",
            new UpdateHallStatusRequest("Maintenance"));

        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var status = await WithDbAsync(async db =>
            (await db.Halls.FindAsync(hallId))!.Status.ToString());
        status.Should().Be("Maintenance");
    }

    [Fact]
    public async Task UpdateStatus_AsReception_Returns_403()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var hallId = await WithDbAsync(async db => (await db.Halls.FirstAsync()).Id);

        var resp = await client.PatchAsJsonAsync($"/api/halls/{hallId}/status",
            new UpdateHallStatusRequest("Maintenance"));

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateStatus_BadStatus_Returns_400()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);
        var hallId = await WithDbAsync(async db => (await db.Halls.FirstAsync()).Id);

        var resp = await client.PatchAsJsonAsync($"/api/halls/{hallId}/status",
            new UpdateHallStatusRequest("Sparkling"));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resp.ReadErrorMessageAsync()).Should().Contain("valid hall status");
    }

    [Fact]
    public async Task UpdateStatus_UnknownHall_Returns_404()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);

        var resp = await client.PatchAsJsonAsync("/api/halls/9999/status",
            new UpdateHallStatusRequest("Available"));

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
