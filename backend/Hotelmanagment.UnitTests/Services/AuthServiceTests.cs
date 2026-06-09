using Hotelmanagment.Application.DTOs;
using Hotelmanagment.Application.Services;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.UnitTests.Common;
using Microsoft.Extensions.Configuration;

namespace Hotelmanagment.UnitTests.Services;

public class AuthServiceTests
{
    private static IConfiguration Config() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"]      = "test-key-test-key-test-key-test-key-test-key-test-key-1234567890",
                ["Jwt:Issuer"]   = "TestIssuer",
                ["Jwt:Audience"] = "TestAudience"
            })
            .Build();

    [Fact]
    public async Task Login_CorrectCredentials_ReturnsTokenAndRoles()
    {
        var db = TestDbFactory.NewDb();
        db.AddStaff(username: "u1", password: "pw123456", roles: new[] { StaffRole.Admin });
        var svc = new AuthService(db, Config());

        var result = await svc.LoginAsync(new LoginRequest("u1", "pw123456"));

        result.Should().NotBeNull();
        result!.Token.Should().NotBeNullOrWhiteSpace();
        result.Roles.Should().Contain(nameof(StaffRole.Admin));
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsNull()
    {
        var db = TestDbFactory.NewDb();
        db.AddStaff(username: "u1", password: "right");
        var svc = new AuthService(db, Config());

        var result = await svc.LoginAsync(new LoginRequest("u1", "wrong"));

        result.Should().BeNull();
    }

    [Fact]
    public async Task Login_UnknownUser_ReturnsNull()
    {
        var svc = new AuthService(TestDbFactory.NewDb(), Config());

        var result = await svc.LoginAsync(new LoginRequest("nobody", "anything"));

        result.Should().BeNull();
    }

    [Fact]
    public async Task Login_InactiveUser_ReturnsNull()
    {
        var db = TestDbFactory.NewDb();
        db.AddStaff(username: "u1", password: "pw123456", isActive: false);
        var svc = new AuthService(db, Config());

        var result = await svc.LoginAsync(new LoginRequest("u1", "pw123456"));

        result.Should().BeNull();
    }

    [Fact]
    public async Task Login_MultipleRoles_AllAppearInResult()
    {
        var db = TestDbFactory.NewDb();
        db.AddStaff(username: "multi", password: "pw123456",
            roles: new[] { StaffRole.Reception, StaffRole.Cashier });
        var svc = new AuthService(db, Config());

        var result = await svc.LoginAsync(new LoginRequest("multi", "pw123456"));

        result!.Roles.Should().BeEquivalentTo(new[]
        {
            nameof(StaffRole.Reception), nameof(StaffRole.Cashier)
        });
    }
}
