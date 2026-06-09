using Hotelmanagment.Application.DTOs.HallBookings;
using Hotelmanagment.Application.DTOs.Reservations;
using Hotelmanagment.Application.Services;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.UnitTests.Common;

namespace Hotelmanagment.UnitTests.Services;

public class DashboardServiceTests
{
    [Fact]
    public async Task EmptyDatabase_ReturnsAllZeroes()
    {
        var db = TestDbFactory.NewDb();
        var svc = new DashboardService(db);

        var snap = await svc.GetSnapshotAsync(DateOnly.FromDateTime(DateTime.UtcNow));

        snap.BookingsCreated.Should().Be(0);
        snap.GuestsInHouse.Should().Be(0);
        snap.HallBookingsCreated.Should().Be(0);
        snap.HallBookingsRevenue.Should().Be(0m);
    }

    [Fact]
    public async Task CountsTodaysBookingsAndCheckIns_AndAggregatesMoney()
    {
        var db = TestDbFactory.NewDb();
        var folioSvc = new FolioService(db);
        var resSvc = new ReservationService(db, folioSvc);
        var hallBookingSvc = new HallBookingService(db);

        var room = db.AddRoom(pricePerNight: 100m);

        // 1 walk-in check-in (counts as booking + check-in)
        var walkIn = await resSvc.CheckInAsync(new CheckInRequest(
            "Walk", "+1", null, room.Id, DateTime.UtcNow.AddDays(2), null));

        // 1 phone reservation pending
        await resSvc.CreatePhoneReservationAsync(new PhoneReservationRequest(
            "Phone", "+2", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(3)));

        // 1 hall booking confirmed
        var hall = db.AddHall(hourlyRate: 100m);
        var hallStart = DateTime.UtcNow.AddDays(2);
        await hallBookingSvc.CreateBookingAsync(
            new CreateHallBookingRequest(hall.Id, "C", "P", 10, hallStart, hallStart.AddHours(2), null));

        var snap = await new DashboardService(db).GetSnapshotAsync(DateOnly.FromDateTime(DateTime.UtcNow));

        snap.BookingsCreated.Should().Be(2);
        snap.PhoneBookingsCreated.Should().Be(1);
        snap.WalkInBookingsCreated.Should().Be(1);
        snap.CheckIns.Should().Be(1);
        snap.GuestsInHouse.Should().Be(1);
        snap.PendingReservations.Should().Be(1);
        snap.HallBookingsCreated.Should().Be(1);
        snap.HallBookingsRevenue.Should().Be(200m);
        snap.ChargesAdded.Should().BeGreaterThan(0m); // RoomCharge line from walk-in folio
        snap.RoomChargesAdded.Should().BeGreaterThan(0m);
    }

    [Fact]
    public async Task CancelledHallBooking_DoesNotCountTowardsRevenue()
    {
        var db = TestDbFactory.NewDb();
        var hallBookingSvc = new HallBookingService(db);
        var hall = db.AddHall(hourlyRate: 100m);
        var start = DateTime.UtcNow.AddDays(2);
        var booking = await hallBookingSvc.CreateBookingAsync(
            new CreateHallBookingRequest(hall.Id, "C", "P", 10, start, start.AddHours(2), null));
        await hallBookingSvc.CancelBookingAsync(booking.Id);

        var snap = await new DashboardService(db).GetSnapshotAsync(DateOnly.FromDateTime(DateTime.UtcNow));

        snap.HallBookingsCreated.Should().Be(1);
        snap.HallBookingsRevenue.Should().Be(0m);
    }
}
