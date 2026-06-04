using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.DTOs.HallBookings
{
    public record HallBookingDto(
        int Id,
        int HallId,
        string HallName,
        string CustomerName,
        string CustomerPhone,
        string? Purpose,
        int AttendeeCount,
        DateTime StartTime,
        DateTime EndTime,
        decimal TotalPrice,
        string Status,
        DateTime CreatedAt
    );
}
