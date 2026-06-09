namespace Hotelmanagment.Application.DTOs.Rooms
{
    /// <summary>
    /// Add or update one feature in a room. If a row for (RoomId, Type) already
    /// exists, the service updates its quantity / notes — it never inserts a
    /// duplicate. Send a Quantity of zero or negative is rejected (use DELETE
    /// to remove a feature entirely).
    /// </summary>
    public record UpsertRoomFeatureRequest(
        string Type,
        int Quantity = 1,
        string? Notes = null
    );
}
