using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.DTOs.Reservations
{
    public record CheckInRequest(
        string GuestFullName,
        string GuestPhone,
        string? NationalId,
        int RoomId,
        DateTime CheckOutDate,
        int? ExistingReservationId,  // fill this if converting a phone booking
        DateTime? CheckInDate = null // optional — defaults to UtcNow for walk-ins
    );
}
