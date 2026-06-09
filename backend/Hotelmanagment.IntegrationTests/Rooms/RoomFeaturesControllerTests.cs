using System.Net;
using Hotelmanagment.Application.DTOs.Rooms;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.IntegrationTests.Infrastructure;

namespace Hotelmanagment.IntegrationTests.Rooms;

public class RoomFeaturesControllerTests : IntegrationTestBase
{
    public RoomFeaturesControllerTests(HotelApiFactory factory) : base(factory) { }

    private async Task<int> FirstRoomIdAsync() =>
        await WithDbAsync(async db => (await db.Rooms.OrderBy(r => r.RoomNumber).FirstAsync()).Id);

    [Fact]
    public async Task Get_AnyAuthenticatedUser_Succeeds_AndReturnsSeededFeatures()
    {
        var client = await ClientAsAsync(TestAccounts.Cashier);
        var roomId = await FirstRoomIdAsync();

        var resp = await client.GetAsync($"/api/rooms/{roomId}/features");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var features = await resp.ReadJsonAsync<List<RoomFeatureDto>>();
        features.Should().NotBeEmpty("seeded rooms ship with default features");
        features.Select(f => f.Type).Should().Contain("Tv");
    }

    [Fact]
    public async Task Get_Anonymous_Returns_401()
    {
        var roomId = await FirstRoomIdAsync();
        var resp = await AnonymousClient().GetAsync($"/api/rooms/{roomId}/features");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Get_UnknownRoom_Returns_404()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);
        var resp = await client.GetAsync("/api/rooms/9999/features");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Post_AsAdmin_Insert_Then_Update_Same_Type_Only_One_Row()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);
        var roomId = await WithDbAsync(async db =>
        {
            var room = await db.Rooms.OrderBy(r => r.RoomNumber).FirstAsync();
            db.RoomFeatures.RemoveRange(db.RoomFeatures.Where(f => f.RoomId == room.Id));
            await db.SaveChangesAsync();
            return room.Id;
        });

        var insertResp = await client.PostAsJsonAsync($"/api/rooms/{roomId}/features",
            new UpsertRoomFeatureRequest("Tv", Quantity: 1));
        insertResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var updateResp = await client.PostAsJsonAsync($"/api/rooms/{roomId}/features",
            new UpsertRoomFeatureRequest("Tv", Quantity: 2, Notes: "second one in the suite"));
        updateResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResp.ReadJsonAsync<RoomFeatureDto>();
        updated.Quantity.Should().Be(2);
        updated.Notes.Should().Be("second one in the suite");

        await WithDbAsync(async db =>
        {
            var count = await db.RoomFeatures.CountAsync(f =>
                f.RoomId == roomId && f.Type == RoomFeatureType.Tv);
            count.Should().Be(1);
        });
    }

    [Theory]
    [InlineData("roomservice")]
    [InlineData("cashier")]
    [InlineData("reception")]
    [InlineData("restaurant")]
    public async Task Post_NonAdminRoles_Return_403(string role)
    {
        var account = role switch
        {
            "roomservice" => TestAccounts.RoomService,
            "cashier"     => TestAccounts.Cashier,
            "reception"   => TestAccounts.Reception,
            "restaurant"  => TestAccounts.Restaurant,
            _ => throw new ArgumentOutOfRangeException(nameof(role))
        };
        var client = await ClientAsAsync(account);
        var roomId = await FirstRoomIdAsync();

        var resp = await client.PostAsJsonAsync($"/api/rooms/{roomId}/features",
            new UpsertRoomFeatureRequest("Hairdryer", Quantity: 1));

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Post_InvalidQuantity_Returns_400()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);
        var roomId = await FirstRoomIdAsync();

        var resp = await client.PostAsJsonAsync($"/api/rooms/{roomId}/features",
            new UpsertRoomFeatureRequest("Tv", Quantity: 0));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Post_InvalidType_Returns_400()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);
        var roomId = await FirstRoomIdAsync();

        var resp = await client.PostAsJsonAsync($"/api/rooms/{roomId}/features",
            new UpsertRoomFeatureRequest("Spaceship", Quantity: 1));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Delete_AsAdmin_RemovesFeature()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);
        var (roomId, featureId) = await WithDbAsync(async db =>
        {
            var feature = await db.RoomFeatures.FirstAsync();
            return (feature.RoomId, feature.Id);
        });

        var resp = await client.DeleteAsync($"/api/rooms/{roomId}/features/{featureId}");

        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var stillExists = await WithDbAsync(async db =>
            await db.RoomFeatures.AnyAsync(f => f.Id == featureId));
        stillExists.Should().BeFalse();
    }

    [Theory]
    [InlineData("roomservice")]
    [InlineData("reception")]
    [InlineData("cashier")]
    [InlineData("restaurant")]
    public async Task Delete_NonAdminRoles_Return_403(string role)
    {
        var account = role switch
        {
            "roomservice" => TestAccounts.RoomService,
            "cashier"     => TestAccounts.Cashier,
            "reception"   => TestAccounts.Reception,
            "restaurant"  => TestAccounts.Restaurant,
            _ => throw new ArgumentOutOfRangeException(nameof(role))
        };
        var client = await ClientAsAsync(account);
        var (roomId, featureId) = await WithDbAsync(async db =>
        {
            var feature = await db.RoomFeatures.FirstAsync();
            return (feature.RoomId, feature.Id);
        });

        var resp = await client.DeleteAsync($"/api/rooms/{roomId}/features/{featureId}");

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_WrongRoom_Returns_404()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);
        var (otherRoomId, featureId) = await WithDbAsync(async db =>
        {
            var rooms = await db.Rooms.OrderBy(r => r.RoomNumber).ToListAsync();
            var feature = await db.RoomFeatures.FirstAsync(f => f.RoomId == rooms[0].Id);
            return (rooms[1].Id, feature.Id);
        });

        var resp = await client.DeleteAsync($"/api/rooms/{otherRoomId}/features/{featureId}");

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetAllRooms_ReturnsFeaturesEmbedded()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);

        var resp = await client.GetAsync("/api/rooms");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var rooms = await resp.ReadJsonAsync<List<RoomDto>>();
        rooms.Should().NotBeEmpty();
        rooms.SelectMany(r => r.Features).Should().NotBeEmpty(
            "GET /api/rooms should embed each room's contents alongside the room itself");
    }
}
