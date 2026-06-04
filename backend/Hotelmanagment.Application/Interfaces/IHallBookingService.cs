using Hotelmanagment.Application.DTOs.HallBookings;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.Interfaces
{
    public interface IHallBookingService
    {
        Task<HallBookingDto> CreateBookingAsync(CreateHallBookingRequest request);

        // Upcoming and in-progress bookings (Pending or Confirmed), the working
        // list the front desk cares about.
        Task<List<HallBookingDto>> GetActiveBookingsAsync();

        Task<HallBookingDto> ConfirmBookingAsync(int bookingId);
        Task<HallBookingDto> CancelBookingAsync(int bookingId);
        Task<HallBookingDto> CompleteBookingAsync(int bookingId);
    }
}
