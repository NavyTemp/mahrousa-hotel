using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.DTOs.HallBookings
{
    public record CreateHallBookingRequest(
        int HallId,
        string CustomerName,
        string CustomerPhone,
        int AttendeeCount,
        DateTime StartTime,
        DateTime EndTime,
        string? Purpose = null
    );
}
