using System.Net;
using Hotelmanagment.Application.DTOs.Staff;
using Hotelmanagment.IntegrationTests.Infrastructure;

namespace Hotelmanagment.IntegrationTests.Staff;

public class StaffControllerTests : IntegrationTestBase
{
    public StaffControllerTests(HotelApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetAll_AsAdmin_Returns_AllSeededAccounts()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);

        var resp = await client.GetAsync("/api/staff");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var list = await resp.ReadJsonAsync<List<StaffDto>>();
        list.Should().HaveCountGreaterThanOrEqualTo(5);
        list.Select(s => s.Username).Should().Contain("admin");
    }

    [Fact]
    public async Task GetAll_AsReception_Returns_403()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var resp = await client.GetAsync("/api/staff");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_AsAdmin_Returns_201()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);

        var resp = await client.PostAsJsonAsync("/api/staff",
            new CreateStaffRequest("New Tester", "newtester", "secret123", new() { "Reception" }));

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var dto = await resp.ReadJsonAsync<StaffDto>();
        dto.Username.Should().Be("newtester");
        dto.IsActive.Should().BeTrue();
        dto.Roles.Should().Contain("Reception");
    }

    [Fact]
    public async Task Create_DuplicateUsername_Returns_400()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);

        var resp = await client.PostAsJsonAsync("/api/staff",
            new CreateStaffRequest("Whoever", "Admin", "secret123", new() { "Admin" }));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_TooShortPassword_Returns_400()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);

        var resp = await client.PostAsJsonAsync("/api/staff",
            new CreateStaffRequest("x", "tinyuser", "abc", new() { "Cashier" }));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateRoles_ReplacesAssignments()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);
        var created = await (await client.PostAsJsonAsync("/api/staff",
            new CreateStaffRequest("Temp", "temp", "secret123", new() { "Cashier" })))
            .ReadJsonAsync<StaffDto>();

        var resp = await client.PatchAsJsonAsync($"/api/staff/{created.Id}/roles",
            new UpdateStaffRolesRequest(new() { "Admin", "Restaurant" }));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await resp.ReadJsonAsync<StaffDto>();
        dto.Roles.Should().BeEquivalentTo(new[] { "Admin", "Restaurant" });
    }

    [Fact]
    public async Task SetActive_FlipsTheFlag()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);
        var created = await (await client.PostAsJsonAsync("/api/staff",
            new CreateStaffRequest("Toggler", "toggler", "secret123", new() { "Cashier" })))
            .ReadJsonAsync<StaffDto>();

        var resp = await client.PatchAsJsonAsync($"/api/staff/{created.Id}/active",
            new SetStaffActiveRequest(false));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        (await resp.ReadJsonAsync<StaffDto>()).IsActive.Should().BeFalse();
    }
}
