using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.DTOs.Reservations
{
    public record PhoneReservationRequest(
     string GuestFullName,
     string GuestPhone,
     DateTime CheckInDate,
     DateTime CheckOutDate
 );
}
