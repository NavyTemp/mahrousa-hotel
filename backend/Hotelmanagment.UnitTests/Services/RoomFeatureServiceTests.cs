using Hotelmanagment.Application.DTOs.Rooms;
using Hotelmanagment.Application.Services;
using Hotelmanagment.Domain.Entities;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.UnitTests.Common;

namespace Hotelmanagment.UnitTests.Services;

public class RoomFeatureServiceTests
{
    [Fact]
    public async Task GetByRoom_ReturnsAllFeaturesForThatRoomOnly()
    {
        var db = TestDbFactory.NewDb();
        var roomA = db.AddRoom("101");
        var roomB = db.AddRoom("102");
        db.RoomFeatures.AddRange(
            new RoomFeature { RoomId = roomA.Id, Type = RoomFeatureType.Tv,        Quantity = 1 },
            new RoomFeature { RoomId = roomA.Id, Type = RoomFeatureType.KingBed,   Quantity = 1 },
            new RoomFeature { RoomId = roomB.Id, Type = RoomFeatureType.MiniFridge, Quantity = 1 }
        );
        await db.SaveChangesAsync();
        var svc = new RoomFeatureService(db);

        var result = await svc.GetByRoomAsync(roomA.Id);

        result.Select(f => f.Type).Should().BeEquivalentTo(new[] { "KingBed", "Tv" });
    }

    [Fact]
    public async Task GetByRoom_UnknownRoom_Throws()
    {
        var svc = new RoomFeatureService(TestDbFactory.NewDb());

        var act = () => svc.GetByRoomAsync(404);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Upsert_NewFeature_Inserts()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom("201");
        var svc = new RoomFeatureService(db);

        var dto = await svc.UpsertAsync(room.Id,
            new UpsertRoomFeatureRequest("Tv", Quantity: 2, Notes: "55-inch"));

        dto.Type.Should().Be("Tv");
        dto.Quantity.Should().Be(2);
        dto.Notes.Should().Be("55-inch");
        (await db.RoomFeatures.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Upsert_ExistingFeature_UpdatesInPlace_NoDuplicate()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom("201");
        db.RoomFeatures.Add(new RoomFeature
        {
            RoomId = room.Id,
            Type = RoomFeatureType.Tv,
            Quantity = 1,
            Notes = "old"
        });
        await db.SaveChangesAsync();
        var svc = new RoomFeatureService(db);

        var dto = await svc.UpsertAsync(room.Id,
            new UpsertRoomFeatureRequest("Tv", Quantity: 3, Notes: "new"));

        dto.Quantity.Should().Be(3);
        dto.Notes.Should().Be("new");
        (await db.RoomFeatures.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Upsert_IsCaseInsensitiveForType()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom("201");
        var svc = new RoomFeatureService(db);

        var dto = await svc.UpsertAsync(room.Id,
            new UpsertRoomFeatureRequest("kingbed", Quantity: 1));

        dto.Type.Should().Be("KingBed");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public async Task Upsert_RejectsNonPositiveQuantity(int quantity)
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom("201");
        var svc = new RoomFeatureService(db);

        var act = () => svc.UpsertAsync(room.Id,
            new UpsertRoomFeatureRequest("Tv", quantity));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*greater than zero*");
    }

    [Fact]
    public async Task Upsert_RejectsUnknownFeatureType()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom("201");
        var svc = new RoomFeatureService(db);

        var act = () => svc.UpsertAsync(room.Id,
            new UpsertRoomFeatureRequest("Helicopter", Quantity: 1));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not a valid room feature type*");
    }

    [Fact]
    public async Task Upsert_RejectsOverLongNotes()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom("201");
        var svc = new RoomFeatureService(db);
        var bigNote = new string('x', 201);

        var act = () => svc.UpsertAsync(room.Id,
            new UpsertRoomFeatureRequest("Tv", Quantity: 1, Notes: bigNote));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*200 characters*");
    }

    [Fact]
    public async Task Upsert_BlankNotes_StoredAsNull()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom("201");
        var svc = new RoomFeatureService(db);

        var dto = await svc.UpsertAsync(room.Id,
            new UpsertRoomFeatureRequest("Tv", Quantity: 1, Notes: "   "));

        dto.Notes.Should().BeNull();
    }

    [Fact]
    public async Task Upsert_UnknownRoom_Throws()
    {
        var svc = new RoomFeatureService(TestDbFactory.NewDb());

        var act = () => svc.UpsertAsync(404,
            new UpsertRoomFeatureRequest("Tv", Quantity: 1));

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Delete_RemovesFeature()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom("201");
        var feature = new RoomFeature { RoomId = room.Id, Type = RoomFeatureType.Tv, Quantity = 1 };
        db.RoomFeatures.Add(feature);
        await db.SaveChangesAsync();
        var svc = new RoomFeatureService(db);

        await svc.DeleteAsync(room.Id, feature.Id);

        (await db.RoomFeatures.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Delete_WrongRoom_Throws()
    {
        var db = TestDbFactory.NewDb();
        var roomA = db.AddRoom("101");
        var roomB = db.AddRoom("102");
        var feature = new RoomFeature { RoomId = roomA.Id, Type = RoomFeatureType.Tv, Quantity = 1 };
        db.RoomFeatures.Add(feature);
        await db.SaveChangesAsync();
        var svc = new RoomFeatureService(db);

        var act = () => svc.DeleteAsync(roomB.Id, feature.Id);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Delete_UnknownFeature_Throws()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom("101");
        var svc = new RoomFeatureService(db);

        var act = () => svc.DeleteAsync(room.Id, 9999);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task RoomService_GetAll_IncludesFeatures()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom("101");
        db.RoomFeatures.AddRange(
            new RoomFeature { RoomId = room.Id, Type = RoomFeatureType.Tv,         Quantity = 1 },
            new RoomFeature { RoomId = room.Id, Type = RoomFeatureType.MiniFridge, Quantity = 1 }
        );
        await db.SaveChangesAsync();
        var svc = new RoomService(db);

        var rooms = await svc.GetAllRoomsAsync();

        rooms.Should().ContainSingle()
            .Which.Features.Select(f => f.Type)
            .Should().BeEquivalentTo(new[] { "MiniFridge", "Tv" });
    }
}
