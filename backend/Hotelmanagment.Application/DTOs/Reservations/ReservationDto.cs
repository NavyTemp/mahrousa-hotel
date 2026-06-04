using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.DTOs.Reservations
{
    public record ReservationDto(
    int Id,
    string GuestName,
    string GuestPhone,
    string? RoomNumber,
    string Status,
    string Source,
    DateTime CheckInDate,
    DateTime CheckOutDate
);
}
