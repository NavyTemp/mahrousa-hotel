using Hotelmanagment.Application.Services;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.UnitTests.Common;

namespace Hotelmanagment.UnitTests.Services;

public class RoomServiceTests
{
    [Fact]
    public async Task GetAll_ReturnsAllRooms()
    {
        var db = TestDbFactory.NewDb();
        db.AddRoom("101");
        db.AddRoom("102");
        var svc = new RoomService(db);

        var rooms = await svc.GetAllRoomsAsync();

        rooms.Select(r => r.RoomNumber).Should().BeEquivalentTo("101", "102");
    }

    [Theory]
    [InlineData(RoomStatus.Available, RoomStatus.Maintenance)]
    [InlineData(RoomStatus.Dirty,     RoomStatus.Available)]
    [InlineData(RoomStatus.Dirty,     RoomStatus.Maintenance)]
    [InlineData(RoomStatus.Maintenance, RoomStatus.Available)]
    public async Task UpdateStatus_AllowsValidTransitions(RoomStatus from, RoomStatus to)
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom(status: from);
        var svc = new RoomService(db);

        await svc.UpdateRoomStatusAsync(room.Id, to.ToString());

        (await db.Rooms.FindAsync(room.Id))!.Status.Should().Be(to);
    }

    [Theory]
    [InlineData(RoomStatus.Available, RoomStatus.Occupied)]
    [InlineData(RoomStatus.Available, RoomStatus.Dirty)]
    [InlineData(RoomStatus.Occupied,  RoomStatus.Available)]
    [InlineData(RoomStatus.Occupied,  RoomStatus.Maintenance)]
    public async Task UpdateStatus_RejectsInvalidTransitions(RoomStatus from, RoomStatus to)
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom(status: from);
        var svc = new RoomService(db);

        var act = () => svc.UpdateRoomStatusAsync(room.Id, to.ToString());

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Cannot transition*");
    }

    [Fact]
    public async Task UpdateStatus_RejectsUnknownStatus()
    {
        var db = TestDbFactory.NewDb();
        var room = db.AddRoom();
        var svc = new RoomService(db);

        var act = () => svc.UpdateRoomStatusAsync(room.Id, "Floating");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not a valid room status*");
    }

    [Fact]
    public async Task UpdateStatus_NotFound_Throws()
    {
        var svc = new RoomService(TestDbFactory.NewDb());

        var act = () => svc.UpdateRoomStatusAsync(404, "Available");

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
