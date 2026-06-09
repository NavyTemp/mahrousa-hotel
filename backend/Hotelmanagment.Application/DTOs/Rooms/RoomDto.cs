using System.Collections.Generic;

namespace Hotelmanagment.Application.DTOs.Rooms
{
    public record RoomDto(
      int Id,
      string RoomNumber,
      string Type,
      string Status,
      decimal PricePerNight,
      // What is physically in the room (beds, TV, fridge, AC, ...). Empty list
      // when the room has no recorded features yet.
      List<RoomFeatureDto> Features
  );
}
