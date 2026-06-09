using Hotelmanagment.Application.DTOs.Staff;
using Hotelmanagment.Application.Services;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.UnitTests.Common;

namespace Hotelmanagment.UnitTests.Services;

public class StaffServiceTests
{
    [Fact]
    public async Task Create_HappyPath_HashesPasswordAndStoresRoles()
    {
        var db = TestDbFactory.NewDb();
        var svc = new StaffService(db);

        var dto = await svc.CreateAsync(new CreateStaffRequest(
            "Test User", "TestUser", "secret123",
            new() { "Reception", "Cashier" }));

        dto.Username.Should().Be("testuser");
        dto.Roles.Should().BeEquivalentTo(new[] { "Cashier", "Reception" });
        (await db.Staff.SingleAsync()).PasswordHash.Should().NotBe("secret123");
    }

    [Theory]
    [InlineData("", "user", "secret123", "Full name")]
    [InlineData("name", "", "secret123", "Username")]
    [InlineData("name", "user", "1234", "Password")]
    public async Task Create_RejectsInvalidInputs(string fullName, string username, string password, string keyword)
    {
        var svc = new StaffService(TestDbFactory.NewDb());

        var act = () => svc.CreateAsync(new CreateStaffRequest(
            fullName, username, password, new() { "Admin" }));

        var ex = await act.Should().ThrowAsync<InvalidOperationException>();
        ex.Which.Message.Should().Contain(keyword);
    }

    [Fact]
    public async Task Create_RejectsDuplicateUsername()
    {
        var db = TestDbFactory.NewDb();
        db.AddStaff(username: "taken");
        var svc = new StaffService(db);

        var act = () => svc.CreateAsync(new CreateStaffRequest(
            "X", "Taken", "secret123", new() { "Admin" }));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already taken*");
    }

    [Fact]
    public async Task Create_RejectsUnknownRole()
    {
        var svc = new StaffService(TestDbFactory.NewDb());

        var act = () => svc.CreateAsync(new CreateStaffRequest(
            "X", "x", "secret123", new() { "Wizard" }));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not a valid role*");
    }

    [Fact]
    public async Task Create_RequiresAtLeastOneRole()
    {
        var svc = new StaffService(TestDbFactory.NewDb());

        var act = () => svc.CreateAsync(new CreateStaffRequest(
            "X", "x", "secret123", new()));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*At least one role*");
    }

    [Fact]
    public async Task UpdateRoles_ReplacesAssignments()
    {
        var db = TestDbFactory.NewDb();
        var staff = db.AddStaff(roles: new[] { StaffRole.Reception });
        var svc = new StaffService(db);

        var dto = await svc.UpdateRolesAsync(staff.Id,
            new[] { "Admin", "Cashier" });

        dto.Roles.Should().BeEquivalentTo(new[] { "Admin", "Cashier" });
    }

    [Fact]
    public async Task UpdateRoles_UnknownStaff_Throws()
    {
        var svc = new StaffService(TestDbFactory.NewDb());

        var act = () => svc.UpdateRolesAsync(404, new[] { "Admin" });

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task SetActive_TogglesFlag()
    {
        var db = TestDbFactory.NewDb();
        var staff = db.AddStaff();
        var svc = new StaffService(db);

        var dto = await svc.SetActiveAsync(staff.Id, false);
        dto.IsActive.Should().BeFalse();

        var dto2 = await svc.SetActiveAsync(staff.Id, true);
        dto2.IsActive.Should().BeTrue();
    }
}
