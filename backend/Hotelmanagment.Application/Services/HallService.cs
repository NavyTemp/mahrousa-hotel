using Hotelmanagment.Application.DTOs.Halls;
using Hotelmanagment.Application.Interfaces;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.Services
{
    public class HallService(HotelDbContext _db) : IHallService
    {
        public async Task<List<HallDto>> GetAllHallsAsync()
        {
            return await _db.Halls
                .OrderBy(h => h.Name)
                .Select(h => new HallDto(h.Id, h.Name, h.Capacity, h.HourlyRate, h.Status.ToString()))
                .ToListAsync();
        }

        public async Task<List<HallDto>> GetAvailableHallsAsync(DateTime start, DateTime end)
        {
            var startUtc = HallBookingService.AsUtc(start);
            var endUtc = HallBookingService.AsUtc(end);

            if (endUtc <= startUtc)
                throw new InvalidOperationException("End time must be after start time.");

            // Available = not under maintenance AND no active (non-cancelled)
            // booking overlaps the requested window. Two ranges overlap when
            // each starts before the other ends.
            return await _db.Halls
                .Where(h => h.Status == HallStatus.Available)
                .Where(h => !h.Bookings.Any(b =>
                    b.Status != HallBookingStatus.Cancelled &&
                    b.StartTime < endUtc &&
                    startUtc < b.EndTime))
                .OrderBy(h => h.Name)
                .Select(h => new HallDto(h.Id, h.Name, h.Capacity, h.HourlyRate, h.Status.ToString()))
                .ToListAsync();
        }

        public async Task UpdateHallStatusAsync(int hallId, string newStatus)
        {
            var hall = await _db.Halls.FindAsync(hallId)
                ?? throw new KeyNotFoundException($"Hall {hallId} not found.");

            if (!Enum.TryParse<HallStatus>(newStatus, ignoreCase: true, out var parsed))
                throw new InvalidOperationException($"'{newStatus}' is not a valid hall status.");

            hall.Status = parsed;
            await _db.SaveChangesAsync();
        }
    }
}
