using System.Net;
using Hotelmanagment.Application.DTOs.Inventory;
using Hotelmanagment.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Hotelmanagment.IntegrationTests.Inventory;

public class InventoryControllerTests : IntegrationTestBase
{
    public InventoryControllerTests(HotelApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetAll_AsRoomService_Returns_SeededCatalog()
    {
        var client = await ClientAsAsync(TestAccounts.RoomService);

        var resp = await client.GetAsync("/api/inventory");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var items = await resp.ReadJsonAsync<List<InventoryItemDto>>();
        items.Should().NotBeEmpty();
        items.Select(i => i.Name).Should().Contain("Towel");
    }

    [Fact]
    public async Task GetAll_AsCashier_Returns_403()
    {
        var client = await ClientAsAsync(TestAccounts.Cashier);

        var resp = await client.GetAsync("/api/inventory");

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UseItem_DecrementsStock_AndCreatesUsageLog()
    {
        var client = await ClientAsAsync(TestAccounts.RoomService);
        var (itemId, before) = await WithDbAsync(async db =>
        {
            var i = await db.InventoryItems.FirstAsync();
            return (i.Id, i.Quantity);
        });
        var roomId = await WithDbAsync(async db => (await db.Rooms.FirstAsync()).Id);

        var resp = await client.PostAsJsonAsync("/api/inventory/use",
            new UseInventoryRequest(roomId, itemId, 3));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        await WithDbAsync(async db =>
        {
            (await db.InventoryItems.FindAsync(itemId))!.Quantity.Should().Be(before - 3);
            (await db.InventoryUsageLogs.CountAsync()).Should().Be(1);
        });
    }

    [Fact]
    public async Task UseItem_OverDraft_Returns_400()
    {
        var client = await ClientAsAsync(TestAccounts.RoomService);
        var itemId = await WithDbAsync(async db => (await db.InventoryItems.FirstAsync()).Id);
        var roomId = await WithDbAsync(async db => (await db.Rooms.FirstAsync()).Id);

        var resp = await client.PostAsJsonAsync("/api/inventory/use",
            new UseInventoryRequest(roomId, itemId, 99_999));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Restock_AddsStock_AndCreatesRestockLog()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);
        var (itemId, before) = await WithDbAsync(async db =>
        {
            var i = await db.InventoryItems.FirstAsync();
            return (i.Id, i.Quantity);
        });

        var resp = await client.PostAsJsonAsync("/api/inventory/restock",
            new RestockInventoryRequest(itemId, 25));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await resp.ReadJsonAsync<InventoryItemDto>();
        dto.Quantity.Should().Be(before + 25);
        await WithDbAsync(async db =>
            (await db.InventoryRestockLogs.CountAsync()).Should().Be(1));
    }

    [Fact]
    public async Task RestockLogs_AsRoomService_Returns_200()
    {
        var client = await ClientAsAsync(TestAccounts.RoomService);

        var resp = await client.GetAsync("/api/inventory/restock-logs");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UsageLogs_AsRoomService_Returns_200()
    {
        var client = await ClientAsAsync(TestAccounts.RoomService);

        var resp = await client.GetAsync("/api/inventory/usage-logs");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
