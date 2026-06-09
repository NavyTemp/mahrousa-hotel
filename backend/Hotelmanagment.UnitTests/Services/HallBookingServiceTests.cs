using Hotelmanagment.Application.DTOs.HallBookings;
using Hotelmanagment.Application.Services;
using Hotelmanagment.Domain.Entities;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.UnitTests.Common;

namespace Hotelmanagment.UnitTests.Services;

public class HallBookingServiceTests
{
    private static (HallBookingService svc, Hotelmanagment.Infrastructure.Persistence.HotelDbContext db, Hall hall)
        Setup(int capacity = 100, decimal rate = 100m, HallStatus status = HallStatus.Available)
    {
        var db = TestDbFactory.NewDb();
        var hall = db.AddHall(capacity: capacity, hourlyRate: rate, status: status);
        return (new HallBookingService(db), db, hall);
    }

    private static CreateHallBookingRequest Req(int hallId,
        int attendees = 10,
        DateTime? start = null,
        DateTime? end = null,
        string name = "Jane Doe",
        string phone = "+1000",
        string? purpose = null)
        => new(
            hallId,
            name,
            phone,
            attendees,
            start ?? DateTime.UtcNow.AddDays(1),
            end ?? DateTime.UtcNow.AddDays(1).AddHours(3),
            purpose);

    [Fact]
    public async Task CreateBooking_HappyPath_Persists_And_PricesByHourlyRate()
    {
        var (svc, db, hall) = Setup(rate: 200m);
        var start = DateTime.UtcNow.AddDays(2);
        var end = start.AddHours(3);

        var dto = await svc.CreateBookingAsync(Req(hall.Id, attendees: 50, start: start, end: end));

        dto.HallId.Should().Be(hall.Id);
        dto.AttendeeCount.Should().Be(50);
        dto.TotalPrice.Should().Be(600m); // 200 * 3
        dto.Status.Should().Be(nameof(HallBookingStatus.Pending));
        (await db.HallBookings.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task CreateBooking_PartialHour_RoundsUp()
    {
        var (svc, _, hall) = Setup(rate: 150m);
        var start = DateTime.UtcNow.AddDays(2);
        var end = start.AddHours(2).AddMinutes(15);

        var dto = await svc.CreateBookingAsync(Req(hall.Id, start: start, end: end));

        dto.TotalPrice.Should().Be(450m); // ceil(2.25) = 3 hours * 150
    }

    [Fact]
    public async Task CreateBooking_VeryShortWindow_BillsMinimumOneHour()
    {
        var (svc, _, hall) = Setup(rate: 80m);
        var start = DateTime.UtcNow.AddDays(2);
        var end = start.AddMinutes(10);

        var dto = await svc.CreateBookingAsync(Req(hall.Id, start: start, end: end));

        dto.TotalPrice.Should().Be(80m);
    }

    [Fact]
    public async Task CreateBooking_RejectsEndBeforeOrEqualStart()
    {
        var (svc, _, hall) = Setup();
        var start = DateTime.UtcNow.AddDays(2);

        var act = () => svc.CreateBookingAsync(Req(hall.Id, start: start, end: start));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*End time must be after start time*");
    }

    [Fact]
    public async Task CreateBooking_RejectsBookingThatEndsInThePast()
    {
        var (svc, _, hall) = Setup();
        var start = DateTime.UtcNow.AddDays(-2);
        var end = DateTime.UtcNow.AddHours(-1);

        var act = () => svc.CreateBookingAsync(Req(hall.Id, start: start, end: end));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ends in the past*");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public async Task CreateBooking_RejectsNonPositiveAttendeeCount(int attendees)
    {
        var (svc, _, hall) = Setup();

        var act = () => svc.CreateBookingAsync(Req(hall.Id, attendees: attendees));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Attendee count*");
    }

    [Fact]
    public async Task CreateBooking_RejectsWhenHallNotFound()
    {
        var (svc, _, _) = Setup();

        var act = () => svc.CreateBookingAsync(Req(hallId: 999));

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Hall 999*");
    }

    [Fact]
    public async Task CreateBooking_RejectsHallUnderMaintenance()
    {
        var (svc, _, hall) = Setup(status: HallStatus.Maintenance);

        var act = () => svc.CreateBookingAsync(Req(hall.Id));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*under maintenance*");
    }

    [Fact]
    public async Task CreateBooking_RejectsWhenAttendeesExceedCapacity()
    {
        var (svc, _, hall) = Setup(capacity: 50);

        var act = () => svc.CreateBookingAsync(Req(hall.Id, attendees: 51));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*seats 50*51 attendees*");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task CreateBooking_RequiresCustomerName(string? name)
    {
        var (svc, _, hall) = Setup();
        var req = Req(hall.Id) with { CustomerName = name! };

        var act = () => svc.CreateBookingAsync(req);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Customer name is required*");
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    public async Task CreateBooking_RequiresCustomerPhone(string phone)
    {
        var (svc, _, hall) = Setup();
        var req = Req(hall.Id) with { CustomerPhone = phone };

        var act = () => svc.CreateBookingAsync(req);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Customer phone*");
    }

    [Fact]
    public async Task CreateBooking_RejectsOverlapWithActiveBooking()
    {
        var (svc, _, hall) = Setup();
        var start = DateTime.UtcNow.AddDays(3);
        await svc.CreateBookingAsync(Req(hall.Id, start: start, end: start.AddHours(4)));

        var act = () => svc.CreateBookingAsync(
            Req(hall.Id, start: start.AddHours(2), end: start.AddHours(6)));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already booked*");
    }

    [Fact]
    public async Task CreateBooking_OverlapWithCancelledBookingIsAllowed()
    {
        var (svc, _, hall) = Setup();
        var start = DateTime.UtcNow.AddDays(3);

        var first = await svc.CreateBookingAsync(Req(hall.Id, start: start, end: start.AddHours(4)));
        await svc.CancelBookingAsync(first.Id);

        var second = await svc.CreateBookingAsync(
            Req(hall.Id, start: start.AddHours(2), end: start.AddHours(6)));

        second.Id.Should().NotBe(first.Id);
        second.Status.Should().Be(nameof(HallBookingStatus.Pending));
    }

    [Fact]
    public async Task CreateBooking_BackToBack_IsAllowed()
    {
        // Booking A: 14:00-16:00, Booking B: 16:00-18:00 → no overlap.
        var (svc, _, hall) = Setup();
        var start = DateTime.UtcNow.AddDays(4).Date.AddHours(14);

        await svc.CreateBookingAsync(Req(hall.Id, start: start, end: start.AddHours(2)));
        var b = await svc.CreateBookingAsync(Req(hall.Id, start: start.AddHours(2), end: start.AddHours(4)));

        b.Status.Should().Be(nameof(HallBookingStatus.Pending));
    }

    [Fact]
    public async Task ConfirmBooking_MovesPendingToConfirmed()
    {
        var (svc, _, hall) = Setup();
        var created = await svc.CreateBookingAsync(Req(hall.Id));

        var confirmed = await svc.ConfirmBookingAsync(created.Id);

        confirmed.Status.Should().Be(nameof(HallBookingStatus.Confirmed));
    }

    [Fact]
    public async Task ConfirmBooking_RejectsNonPending()
    {
        var (svc, _, hall) = Setup();
        var created = await svc.CreateBookingAsync(Req(hall.Id));
        await svc.ConfirmBookingAsync(created.Id);

        var act = () => svc.ConfirmBookingAsync(created.Id);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*pending bookings can be confirmed*");
    }

    [Fact]
    public async Task CancelBooking_FromConfirmed_Succeeds()
    {
        var (svc, _, hall) = Setup();
        var created = await svc.CreateBookingAsync(Req(hall.Id));
        await svc.ConfirmBookingAsync(created.Id);

        var cancelled = await svc.CancelBookingAsync(created.Id);

        cancelled.Status.Should().Be(nameof(HallBookingStatus.Cancelled));
    }

    [Fact]
    public async Task CancelBooking_AlreadyCancelled_Throws()
    {
        var (svc, _, hall) = Setup();
        var created = await svc.CreateBookingAsync(Req(hall.Id));
        await svc.CancelBookingAsync(created.Id);

        var act = () => svc.CancelBookingAsync(created.Id);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task CompleteBooking_FromConfirmed_Succeeds()
    {
        var (svc, _, hall) = Setup();
        var created = await svc.CreateBookingAsync(Req(hall.Id));
        await svc.ConfirmBookingAsync(created.Id);

        var done = await svc.CompleteBookingAsync(created.Id);

        done.Status.Should().Be(nameof(HallBookingStatus.Completed));
    }

    [Fact]
    public async Task CompleteBooking_AlreadyCompleted_Throws()
    {
        var (svc, _, hall) = Setup();
        var created = await svc.CreateBookingAsync(Req(hall.Id));
        await svc.CompleteBookingAsync(created.Id);

        var act = () => svc.CompleteBookingAsync(created.Id);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task GetActive_OnlyReturnsPendingAndConfirmed()
    {
        var (svc, _, hall) = Setup();
        var start = DateTime.UtcNow.AddDays(5);
        var pending = await svc.CreateBookingAsync(Req(hall.Id, start: start, end: start.AddHours(1)));
        var confirmed = await svc.CreateBookingAsync(Req(hall.Id, start: start.AddHours(2), end: start.AddHours(3)));
        await svc.ConfirmBookingAsync(confirmed.Id);
        var cancelled = await svc.CreateBookingAsync(Req(hall.Id, start: start.AddHours(4), end: start.AddHours(5)));
        await svc.CancelBookingAsync(cancelled.Id);

        var active = await svc.GetActiveBookingsAsync();

        active.Select(b => b.Id).Should().BeEquivalentTo(new[] { pending.Id, confirmed.Id });
    }

    [Fact]
    public void AsUtc_NormalisesUnspecifiedToUtc()
    {
        var local = new DateTime(2026, 7, 1, 18, 0, 0, DateTimeKind.Unspecified);
        var result = HallBookingService.AsUtc(local);
        result.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public void AsUtc_ConvertsLocalToUtc()
    {
        var loc = new DateTime(2026, 7, 1, 18, 0, 0, DateTimeKind.Local);
        var result = HallBookingService.AsUtc(loc);
        result.Kind.Should().Be(DateTimeKind.Utc);
    }
}
