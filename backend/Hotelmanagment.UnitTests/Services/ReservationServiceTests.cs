using HotelManagement.Domain.Entities;
using Hotelmanagment.Application.DTOs.Reservations;
using Hotelmanagment.Application.Services;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.UnitTests.Common;

namespace Hotelmanagment.UnitTests.Services;

public class ReservationServiceTests
{
    private static (ReservationService res, FolioService folio,
        Hotelmanagment.Infrastructure.Persistence.HotelDbContext db) Setup()
    {
        var db = TestDbFactory.NewDb();
        var folio = new FolioService(db);
        var res = new ReservationService(db, folio);
        return (res, folio, db);
    }

    [Fact]
    public async Task WalkInCheckIn_CreatesGuestReservationAndFolio_MarksRoomOccupied()
    {
        var (svc, folio, db) = Setup();
        var room = db.AddRoom("101", pricePerNight: 100m);

        var dto = await svc.CheckInAsync(new CheckInRequest(
            GuestFullName: "Alice",
            GuestPhone: "+1",
            NationalId: "ID123",
            RoomId: room.Id,
            CheckOutDate: DateTime.UtcNow.AddDays(2),
            ExistingReservationId: null,
            CheckInDate: null));

        dto.Status.Should().Be(nameof(ReservationStatus.CheckedIn));
        dto.RoomNumber.Should().Be("101");
        (await db.Rooms.FindAsync(room.Id))!.Status.Should().Be(RoomStatus.Occupied);
        (await db.GuestFolios.CountAsync(f => f.ReservationId == dto.Id)).Should().Be(1);
    }

    [Fact]
    public async Task CheckIn_RejectsUnknownRoom()
    {
        var (svc, _, _) = Setup();

        var act = () => svc.CheckInAsync(new CheckInRequest(
            "Alice", "+1", null, RoomId: 999,
            CheckOutDate: DateTime.UtcNow.AddDays(1),
            ExistingReservationId: null));

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CheckIn_RejectsRoomNotAvailable()
    {
        var (svc, _, db) = Setup();
        var room = db.AddRoom(status: RoomStatus.Occupied);

        var act = () => svc.CheckInAsync(new CheckInRequest(
            "Alice", "+1", null, room.Id, DateTime.UtcNow.AddDays(1), null));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not available*");
    }

    [Fact]
    public async Task CheckIn_ConvertsExistingPendingReservation()
    {
        var (svc, _, db) = Setup();
        var room = db.AddRoom();
        var phoneRes = await svc.CreatePhoneReservationAsync(new PhoneReservationRequest(
            "Bob", "+2", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(3)));

        var dto = await svc.CheckInAsync(new CheckInRequest(
            "ignored", "ignored", null, room.Id,
            DateTime.UtcNow.AddDays(3), phoneRes.Id));

        dto.Status.Should().Be(nameof(ReservationStatus.CheckedIn));
        dto.GuestName.Should().Be("Bob");
        dto.RoomNumber.Should().Be(room.RoomNumber);
    }

    [Fact]
    public async Task CheckIn_CannotConvertNonPendingReservation()
    {
        var (svc, _, db) = Setup();
        var occupiedRoom = db.AddRoom("101");
        var (_, reservation) = db.AddCheckedInReservation(occupiedRoom);
        var freshRoom = db.AddRoom("102");

        var act = () => svc.CheckInAsync(new CheckInRequest(
            "x", "x", null, freshRoom.Id, DateTime.UtcNow.AddDays(1), reservation.Id));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*pending reservations*");
    }

    [Fact]
    public async Task CreatePhone_PersistsPendingReservation()
    {
        var (svc, _, db) = Setup();

        var dto = await svc.CreatePhoneReservationAsync(new PhoneReservationRequest(
            "Carol", "+3", DateTime.UtcNow.AddDays(2), DateTime.UtcNow.AddDays(5)));

        dto.Status.Should().Be(nameof(ReservationStatus.Pending));
        dto.Source.Should().Be(nameof(ReservationSource.Phone));
        (await db.Reservations.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task GetActive_ReturnsOnlyPendingAndCheckedIn()
    {
        var (svc, folio, db) = Setup();
        var room = db.AddRoom();
        var pending = await svc.CreatePhoneReservationAsync(new PhoneReservationRequest(
            "P", "+1", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(2)));
        var walkIn = await svc.CheckInAsync(new CheckInRequest(
            "W", "+2", null, room.Id, DateTime.UtcNow.AddDays(2), null));

        // Add an unrelated CheckedOut reservation
        var r2 = db.AddRoom("999");
        var (_, completedRes) = db.AddCheckedInReservation(r2);
        completedRes.Status = ReservationStatus.CheckedOut;
        await db.SaveChangesAsync();

        var active = await svc.GetActiveReservationsAsync();

        active.Select(a => a.Id).Should().BeEquivalentTo(new[] { pending.Id, walkIn.Id });
    }
}
