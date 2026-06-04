using Hotelmanagment.Application.DTOs.Halls;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.Interfaces
{
    public interface IHallService
    {
        Task<List<HallDto>> GetAllHallsAsync();

        // Halls that are not under maintenance and have no active booking
        // overlapping the requested [start, end) window.
        Task<List<HallDto>> GetAvailableHallsAsync(DateTime start, DateTime end);

        Task UpdateHallStatusAsync(int hallId, string newStatus);
    }
}
