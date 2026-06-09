using Hotelmanagment.Application.DTOs.Folio;
using Hotelmanagment.Application.Services;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.UnitTests.Common;

namespace Hotelmanagment.UnitTests.Services;

public class RestaurantServiceTests
{
    [Fact]
    public async Task AddCharge_AppendsLineToActiveFolio()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom("301");
        var (_, reservation) = db.AddCheckedInReservation(room);
        var folioSvc = new FolioService(db);
        await folioSvc.CreateFolioForReservationAsync(reservation.Id);

        var svc = new RestaurantService(db);

        await svc.AddChargeAsync(new AddRestaurantChargeRequest("301", "Breakfast", 18.50m));

        var lines = await db.FolioLines.Where(l => l.LineType == FolioLineType.RestaurantCharge).ToListAsync();
        lines.Should().HaveCount(1);
        lines[0].Amount.Should().Be(18.50m);
    }

    [Fact]
    public async Task AddCharge_RejectsNonPositiveAmount()
    {
        var svc = new RestaurantService(TestDbFactory.NewDb());

        var act = () => svc.AddChargeAsync(new AddRestaurantChargeRequest("301", "Free meal", 0m));

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task AddCharge_NoActiveFolio_Throws()
    {
        var db = TestDbFactory.NewDb();
        db.AddRoom("301");
        var svc = new RestaurantService(db);

        var act = () => svc.AddChargeAsync(new AddRestaurantChargeRequest("301", "Lunch", 10m));

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
