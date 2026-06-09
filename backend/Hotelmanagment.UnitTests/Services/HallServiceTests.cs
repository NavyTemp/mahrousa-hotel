using Hotelmanagment.Application.Services;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.UnitTests.Common;

namespace Hotelmanagment.UnitTests.Services;

public class HallServiceTests
{
    [Fact]
    public async Task GetAllHalls_ReturnsAlphabetical()
    {
        var db = TestDbFactory.NewDb();
        db.AddHall("Zeta");
        db.AddHall("Alpha");
        db.AddHall("Beta");
        var svc = new HallService(db);

        var halls = await svc.GetAllHallsAsync();

        halls.Select(h => h.Name).Should().Equal("Alpha", "Beta", "Zeta");
    }

    [Fact]
    public async Task GetAvailable_RejectsBadWindow()
    {
        var svc = new HallService(TestDbFactory.NewDb());
        var now = DateTime.UtcNow;

        var act = () => svc.GetAvailableHallsAsync(now, now);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task GetAvailable_ExcludesMaintenanceHalls()
    {
        var db = TestDbFactory.NewDb();
        db.AddHall("Open");
        db.AddHall("Closed", status: HallStatus.Maintenance);
        var svc = new HallService(db);

        var halls = await svc.GetAvailableHallsAsync(
            DateTime.UtcNow.AddDays(1),
            DateTime.UtcNow.AddDays(1).AddHours(2));

        halls.Select(h => h.Name).Should().Equal("Open");
    }

    [Fact]
    public async Task GetAvailable_ExcludesHallsWithOverlappingActiveBookings()
    {
        var db = TestDbFactory.NewDb();
        var booked = db.AddHall("Booked");
        var free = db.AddHall("Free");
        var svc = new HallService(db);
        var bookingSvc = new HallBookingService(db);

        var start = DateTime.UtcNow.AddDays(1);
        await bookingSvc.CreateBookingAsync(new(booked.Id, "Cust", "+1", 10, start, start.AddHours(3), null));

        var halls = await svc.GetAvailableHallsAsync(start.AddHours(1), start.AddHours(2));

        halls.Select(h => h.Name).Should().Equal("Free");
    }

    [Fact]
    public async Task UpdateStatus_AcceptsValid()
    {
        var db = TestDbFactory.NewDb();
        var hall = db.AddHall();
        var svc = new HallService(db);

        await svc.UpdateHallStatusAsync(hall.Id, "Maintenance");

        (await db.Halls.FindAsync(hall.Id))!.Status.Should().Be(HallStatus.Maintenance);
    }

    [Fact]
    public async Task UpdateStatus_RejectsUnknownValue()
    {
        var db = TestDbFactory.NewDb();
        var hall = db.AddHall();
        var svc = new HallService(db);

        var act = () => svc.UpdateHallStatusAsync(hall.Id, "Glowing");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not a valid hall status*");
    }

    [Fact]
    public async Task UpdateStatus_NotFound_Throws()
    {
        var svc = new HallService(TestDbFactory.NewDb());

        var act = () => svc.UpdateHallStatusAsync(404, "Available");

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
