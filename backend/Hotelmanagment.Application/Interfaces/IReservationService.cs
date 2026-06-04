using Hotelmanagment.Application.DTOs.Reservations;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.Interfaces
{
    public interface IReservationService
    {
        Task<ReservationDto> CreatePhoneReservationAsync(PhoneReservationRequest request);
        Task<ReservationDto> CheckInAsync(CheckInRequest request);
        Task<List<ReservationDto>> GetActiveReservationsAsync();
    }
}
