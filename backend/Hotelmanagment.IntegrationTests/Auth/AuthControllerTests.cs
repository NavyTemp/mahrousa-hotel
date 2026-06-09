using System.Net;
using Hotelmanagment.Application.DTOs;
using Hotelmanagment.IntegrationTests.Infrastructure;

namespace Hotelmanagment.IntegrationTests.Auth;

public class AuthControllerTests : IntegrationTestBase
{
    public AuthControllerTests(HotelApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Login_ValidCredentials_Returns_200_AndRoles()
    {
        var client = AnonymousClient();

        var resp = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(TestAccounts.Reception.Username, TestAccounts.Reception.Password));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.ReadJsonAsync<LoginResponse>();
        body.Roles.Should().Contain("Reception");
        body.StaffId.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task Login_WrongPassword_Returns_401_WithMessage()
    {
        var client = AnonymousClient();

        var resp = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("admin", "wrong"));

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await resp.ReadErrorMessageAsync()).Should().Contain("Invalid");
    }

    [Fact]
    public async Task Login_UnknownUser_Returns_401()
    {
        var client = AnonymousClient();

        var resp = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("ghost", "nopassword"));

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_AllSeededAccounts_Succeed()
    {
        foreach (var account in new[]
        {
            TestAccounts.Admin, TestAccounts.Reception, TestAccounts.Cashier,
            TestAccounts.RoomService, TestAccounts.Restaurant
        })
        {
            var client = AnonymousClient();
            var resp = await client.PostAsJsonAsync("/api/auth/login",
                new LoginRequest(account.Username, account.Password));
            resp.StatusCode.Should().Be(HttpStatusCode.OK, $"because {account.Username} must log in");
            var body = await resp.ReadJsonAsync<LoginResponse>();
            body.Roles.Should().Contain(account.Role);
        }
    }
}
