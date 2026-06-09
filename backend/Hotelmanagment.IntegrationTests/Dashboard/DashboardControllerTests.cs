using System.Net;
using Hotelmanagment.Application.DTOs.Dashboard;
using Hotelmanagment.IntegrationTests.Infrastructure;

namespace Hotelmanagment.IntegrationTests.Dashboard;

public class DashboardControllerTests : IntegrationTestBase
{
    public DashboardControllerTests(HotelApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Snapshot_AsAdmin_Returns_200_WithDefaultsToday()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);

        var resp = await client.GetAsync("/api/dashboard/snapshot");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var snap = await resp.ReadJsonAsync<DashboardSnapshotDto>();
        snap.Date.Should().Be(DateOnly.FromDateTime(DateTime.UtcNow));
    }

    [Fact]
    public async Task Snapshot_AsReception_Returns_403()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);

        var resp = await client.GetAsync("/api/dashboard/snapshot");

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Snapshot_Anonymous_Returns_401()
    {
        var resp = await AnonymousClient().GetAsync("/api/dashboard/snapshot");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Snapshot_ExplicitDate_AcceptedAsIso()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);
        var date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));

        var resp = await client.GetAsync($"/api/dashboard/snapshot?date={date:yyyy-MM-dd}");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var snap = await resp.ReadJsonAsync<DashboardSnapshotDto>();
        snap.Date.Should().Be(date);
    }
}
