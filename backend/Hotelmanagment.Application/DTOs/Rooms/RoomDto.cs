using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.DTOs.Rooms
{
    public record RoomDto(
      int Id,
      string RoomNumber,
      string Type,
      string Status,
      decimal PricePerNight
  );
}
