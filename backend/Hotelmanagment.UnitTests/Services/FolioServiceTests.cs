using Hotelmanagment.Application.Services;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.UnitTests.Common;

namespace Hotelmanagment.UnitTests.Services;

public class FolioServiceTests
{
    [Fact]
    public async Task CreateFolio_AddsRoomChargeLineForNights()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom(pricePerNight: 75m);
        var (_, reservation) = db.AddCheckedInReservation(room, nights: 3);
        var svc = new FolioService(db);

        var folio = await svc.CreateFolioForReservationAsync(reservation.Id);

        folio.Lines.Should().HaveCount(1);
        var line = folio.Lines.Single();
        line.LineType.Should().Be(nameof(FolioLineType.RoomCharge));
        line.Amount.Should().BeGreaterThan(0m);
    }

    [Fact]
    public async Task CreateFolio_RejectsDuplicates()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom();
        var (_, reservation) = db.AddCheckedInReservation(room);
        var svc = new FolioService(db);

        await svc.CreateFolioForReservationAsync(reservation.Id);

        var act = () => svc.CreateFolioForReservationAsync(reservation.Id);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task CreateFolio_UnknownReservation_Throws()
    {
        var svc = new FolioService(TestDbFactory.NewDb());

        var act = () => svc.CreateFolioForReservationAsync(404);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetByRoomNumber_ReturnsActiveFolio()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom("777");
        var (_, reservation) = db.AddCheckedInReservation(room);
        var svc = new FolioService(db);
        await svc.CreateFolioForReservationAsync(reservation.Id);

        var folio = await svc.GetFolioByRoomNumberAsync("777");

        folio.RoomNumber.Should().Be("777");
    }

    [Fact]
    public async Task GetByRoomNumber_Unknown_Throws()
    {
        var svc = new FolioService(TestDbFactory.NewDb());

        var act = () => svc.GetFolioByRoomNumberAsync("999");

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task ConfirmPayment_MarksFolioPaidAndRoomDirty()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom();
        var (_, reservation) = db.AddCheckedInReservation(room);
        var svc = new FolioService(db);
        var folio = await svc.CreateFolioForReservationAsync(reservation.Id);

        await svc.ConfirmPaymentAsync(folio.Id, "uploads/payments/proof.jpg");

        var refreshed = await db.GuestFolios.FindAsync(folio.Id);
        refreshed!.IsPaid.Should().BeTrue();
        refreshed.PaidAt.Should().NotBeNull();
        refreshed.PaymentProofPath.Should().Be("uploads/payments/proof.jpg");

        (await db.Rooms.FindAsync(room.Id))!.Status.Should().Be(RoomStatus.Dirty);
        (await db.Reservations.FindAsync(reservation.Id))!.Status.Should().Be(ReservationStatus.CheckedOut);
    }

    [Fact]
    public async Task ConfirmPayment_RejectsEmptyPath()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom();
        var (_, reservation) = db.AddCheckedInReservation(room);
        var svc = new FolioService(db);
        var folio = await svc.CreateFolioForReservationAsync(reservation.Id);

        var act = () => svc.ConfirmPaymentAsync(folio.Id, "   ");

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task ConfirmPayment_DoubleConfirm_Throws()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom();
        var (_, reservation) = db.AddCheckedInReservation(room);
        var svc = new FolioService(db);
        var folio = await svc.CreateFolioForReservationAsync(reservation.Id);
        await svc.ConfirmPaymentAsync(folio.Id, "p.jpg");

        var act = () => svc.ConfirmPaymentAsync(folio.Id, "p2.jpg");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already been paid*");
    }
}
