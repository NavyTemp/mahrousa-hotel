namespace Hotelmanagment.Application.DTOs.Rooms
{
    /// <summary>
    /// One physical item in a room as exposed over the API.
    /// <see cref="Type"/> is the enum name (e.g. "KingBed", "Tv", "Bathtub").
    /// </summary>
    public record RoomFeatureDto(
        int Id,
        string Type,
        int Quantity,
        string? Notes
    );
}
