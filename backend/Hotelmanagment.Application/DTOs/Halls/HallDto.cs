using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.DTOs.Halls
{
    public record HallDto(
        int Id,
        string Name,
        int Capacity,
        decimal HourlyRate,
        string Status
    );
}
