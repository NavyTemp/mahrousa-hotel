using System.Net;
using Hotelmanagment.Application.DTOs.HallBookings;
using Hotelmanagment.IntegrationTests.Infrastructure;

namespace Hotelmanagment.IntegrationTests.Halls;

public class HallBookingsControllerTests : IntegrationTestBase
{
    public HallBookingsControllerTests(HotelApiFactory factory) : base(factory) { }

    private async Task<int> GetFirstHallIdAsync() =>
        await WithDbAsync(async db => (await db.Halls.FirstAsync()).Id);

    [Fact]
    public async Task Create_AsReception_Returns_201_AndSetsCorrectPrice()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var hallId = await GetFirstHallIdAsync();
        var start = DateTime.UtcNow.AddDays(3);

        var resp = await client.PostAsJsonAsync("/api/hallbookings",
            new CreateHallBookingRequest(hallId, "Jane Doe", "+1 555 0100",
                100, start, start.AddHours(4), "Wedding"));

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.ReadJsonAsync<HallBookingDto>();
        body.Status.Should().Be("Pending");
        body.TotalPrice.Should().BeGreaterThan(0m);
    }

    [Fact]
    public async Task Create_AsCashier_Returns_403()
    {
        var client = await ClientAsAsync(TestAccounts.Cashier);
        var hallId = await GetFirstHallIdAsync();
        var start = DateTime.UtcNow.AddDays(3);

        var resp = await client.PostAsJsonAsync("/api/hallbookings",
            new CreateHallBookingRequest(hallId, "x", "+1", 10, start, start.AddHours(1), null));

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_UnknownHall_Returns_404()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var start = DateTime.UtcNow.AddDays(3);

        var resp = await client.PostAsJsonAsync("/api/hallbookings",
            new CreateHallBookingRequest(9999, "x", "+1", 10, start, start.AddHours(1), null));

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Create_OverlappingBooking_Returns_400()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var hallId = await GetFirstHallIdAsync();
        var start = DateTime.UtcNow.AddDays(4);

        (await client.PostAsJsonAsync("/api/hallbookings",
            new CreateHallBookingRequest(hallId, "First", "+1", 10, start, start.AddHours(4), null)))
            .EnsureSuccessStatusCode();

        var resp = await client.PostAsJsonAsync("/api/hallbookings",
            new CreateHallBookingRequest(hallId, "Second", "+2", 10, start.AddHours(1), start.AddHours(3), null));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resp.ReadErrorMessageAsync()).Should().Contain("already booked");
    }

    [Fact]
    public async Task Create_ExceedingCapacity_Returns_400()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var meetingRoomId = await WithDbAsync(async db =>
            (await db.Halls.FirstAsync(h => h.Name == "Meeting Room 1")).Id);
        var start = DateTime.UtcNow.AddDays(3);

        var resp = await client.PostAsJsonAsync("/api/hallbookings",
            new CreateHallBookingRequest(meetingRoomId, "x", "+1", 9999, start, start.AddHours(1), null));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task FullLifecycle_Confirm_Then_Complete_Succeeds()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var hallId = await GetFirstHallIdAsync();
        var start = DateTime.UtcNow.AddDays(5);

        var created = (await client.PostAsJsonAsync("/api/hallbookings",
            new CreateHallBookingRequest(hallId, "X", "+1", 10, start, start.AddHours(2), null))
        );
        var createdBody = await created.ReadJsonAsync<HallBookingDto>();

        (await client.PostAsync($"/api/hallbookings/{createdBody.Id}/confirm", null))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        var completedResp = await client.PostAsync($"/api/hallbookings/{createdBody.Id}/complete", null);
        completedResp.StatusCode.Should().Be(HttpStatusCode.OK);
        (await completedResp.ReadJsonAsync<HallBookingDto>()).Status.Should().Be("Completed");
    }

    [Fact]
    public async Task Confirm_AlreadyConfirmed_Returns_400()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var hallId = await GetFirstHallIdAsync();
        var start = DateTime.UtcNow.AddDays(6);

        var created = await (await client.PostAsJsonAsync("/api/hallbookings",
            new CreateHallBookingRequest(hallId, "X", "+1", 10, start, start.AddHours(2), null)))
            .ReadJsonAsync<HallBookingDto>();

        (await client.PostAsync($"/api/hallbookings/{created.Id}/confirm", null))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        var second = await client.PostAsync($"/api/hallbookings/{created.Id}/confirm", null);
        second.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetActive_ExcludesCancelled()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var hallId = await GetFirstHallIdAsync();
        var start = DateTime.UtcNow.AddDays(7);

        var keepResp = await client.PostAsJsonAsync("/api/hallbookings",
            new CreateHallBookingRequest(hallId, "Keep", "+1", 10, start, start.AddHours(1), null));
        var killResp = await client.PostAsJsonAsync("/api/hallbookings",
            new CreateHallBookingRequest(hallId, "Kill", "+2", 10, start.AddHours(2), start.AddHours(3), null));
        var keep = await keepResp.ReadJsonAsync<HallBookingDto>();
        var kill = await killResp.ReadJsonAsync<HallBookingDto>();
        (await client.PostAsync($"/api/hallbookings/{kill.Id}/cancel", null)).EnsureSuccessStatusCode();

        var listResp = await client.GetAsync("/api/hallbookings");
        var list = await listResp.ReadJsonAsync<List<HallBookingDto>>();
        list.Select(b => b.Id).Should().Contain(keep.Id).And.NotContain(kill.Id);
    }

    [Fact]
    public async Task Anonymous_Returns_401()
    {
        var client = AnonymousClient();
        var resp = await client.GetAsync("/api/hallbookings");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
