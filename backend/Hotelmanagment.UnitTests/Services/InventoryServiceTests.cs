using Hotelmanagment.Application.DTOs.Inventory;
using Hotelmanagment.Application.Services;
using Hotelmanagment.UnitTests.Common;

namespace Hotelmanagment.UnitTests.Services;

public class InventoryServiceTests
{
    [Fact]
    public async Task UseItem_DecrementsQuantityAndWritesLog()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom();
        var item = db.AddInventoryItem(quantity: 10);
        var staff = db.AddStaff();
        var svc = new InventoryService(db);

        await svc.UseItemAsync(new UseInventoryRequest(room.Id, item.Id, 3), staff.Id);

        (await db.InventoryItems.FindAsync(item.Id))!.Quantity.Should().Be(7);
        (await db.InventoryUsageLogs.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task UseItem_RejectsNonPositiveQuantity()
    {
        var svc = new InventoryService(TestDbFactory.NewDb());

        var act = () => svc.UseItemAsync(new UseInventoryRequest(1, 1, 0), 1);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task UseItem_RejectsWhenStockTooLow()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom();
        var item = db.AddInventoryItem(quantity: 2);
        var staff = db.AddStaff();
        var svc = new InventoryService(db);

        var act = () => svc.UseItemAsync(new UseInventoryRequest(room.Id, item.Id, 5), staff.Id);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Not enough stock*");
    }

    [Fact]
    public async Task UseItem_UnknownItem_Throws()
    {
        var db = TestDbFactory.NewDb();
        db.AddRoom();
        db.AddStaff();
        var svc = new InventoryService(db);

        var act = () => svc.UseItemAsync(new UseInventoryRequest(1, 999, 1), 1);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task RestockItem_AddsAndLogs()
    {
        var db = TestDbFactory.NewDb();
        var staff = db.AddStaff();
        var item = db.AddInventoryItem(quantity: 5);
        var svc = new InventoryService(db);

        var dto = await svc.RestockItemAsync(new RestockInventoryRequest(item.Id, 50), staff.Id);

        dto.Quantity.Should().Be(55);
        (await db.InventoryRestockLogs.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task RestockItem_RejectsExcessiveQuantity()
    {
        var db = TestDbFactory.NewDb();
        var staff = db.AddStaff();
        var item = db.AddInventoryItem();
        var svc = new InventoryService(db);

        var act = () => svc.RestockItemAsync(new RestockInventoryRequest(item.Id, 99_999), staff.Id);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*unreasonably large*");
    }

    [Fact]
    public async Task GetRestockLogs_CapsTakeWithin1To500()
    {
        var db = TestDbFactory.NewDb();
        var staff = db.AddStaff();
        var item = db.AddInventoryItem();
        var svc = new InventoryService(db);
        for (int i = 0; i < 3; i++)
            await svc.RestockItemAsync(new RestockInventoryRequest(item.Id, 1), staff.Id);

        var clamped = await svc.GetRestockLogsAsync(take: 999);
        clamped.Should().HaveCount(3);

        var defaulted = await svc.GetRestockLogsAsync(take: -5);
        defaulted.Should().HaveCount(3);
    }
}
