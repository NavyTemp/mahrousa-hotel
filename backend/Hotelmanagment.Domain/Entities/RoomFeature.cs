using Hotelmanagment.Domain.Enums;

namespace Hotelmanagment.Domain.Entities
{
    /// <summary>
    /// One physical thing inside a room — a bed, a TV, a fridge, etc.
    /// A room has many of these (see <see cref="Room.Features"/>) and a single
    /// row holds the count for that feature in that room, e.g.
    /// "Room 301 has 2 TVs". To bump the count, update the existing row rather
    /// than inserting a second one — there is a unique index on (RoomId, Type).
    /// </summary>
    public class RoomFeature
    {
        public int Id { get; set; }

        public int RoomId { get; set; }
        public Room Room { get; set; } = null!;

        public RoomFeatureType Type { get; set; }

        // Number of this thing in the room. Always >= 1 (services validate);
        // remove the row entirely if the room no longer has any.
        public int Quantity { get; set; } = 1;

        // Optional free-text note, e.g. "55-inch", "broken remote", "facing
        // courtyard". Capped at 200 chars in the EF configuration.
        public string? Notes { get; set; }
    }
}
