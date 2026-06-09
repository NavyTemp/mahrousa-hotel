using System.Net;
using System.Net.Http.Json;
using Hotelmanagment.Application.DTOs;
using Hotelmanagment.IntegrationTests.Infrastructure;

namespace Hotelmanagment.IntegrationTests.Smoke;

public class HealthSmokeTests : IntegrationTestBase
{
    public HealthSmokeTests(HotelApiFactory factory) : base(factory) { }

    [Fact]
    public async Task SwaggerJson_IsReachable()
    {
        var client = AnonymousClient();

        var resp = await client.GetAsync("/swagger/v1/swagger.json");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SeededAdmin_CanLog_In_AndReceiveJwt()
    {
        var client = AnonymousClient();

        var resp = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("admin", "admin123"));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.ReadJsonAsync<LoginResponse>();
        body.Token.Should().NotBeNullOrWhiteSpace();
        body.Roles.Should().Contain("Admin");
    }

    [Fact]
    public async Task ProtectedEndpoint_Requires_Authentication()
    {
        var client = AnonymousClient();

        var resp = await client.GetAsync("/api/dashboard/snapshot");

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
