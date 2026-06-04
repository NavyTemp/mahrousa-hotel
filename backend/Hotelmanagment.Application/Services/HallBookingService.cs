using Hotelmanagment.Application.DTOs.HallBookings;
using Hotelmanagment.Application.Interfaces;
using Hotelmanagment.Domain.Entities;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.Services
{
    public class HallBookingService : IHallBookingService
    {
        private readonly HotelDbContext _db;

        public HallBookingService(HotelDbContext db) => _db = db;

        public async Task<HallBookingDto> CreateBookingAsync(CreateHallBookingRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.CustomerName))
                throw new InvalidOperationException("Customer name is required.");
            if (string.IsNullOrWhiteSpace(request.CustomerPhone))
                throw new InvalidOperationException("Customer phone is required.");

            var start = AsUtc(request.StartTime);
            var end = AsUtc(request.EndTime);

            if (end <= start)
                throw new InvalidOperationException("End time must be after start time.");
            if (end <= DateTime.UtcNow)
                throw new InvalidOperationException("Cannot create a hall booking that ends in the past.");
            if (request.AttendeeCount <= 0)
                throw new InvalidOperationException("Attendee count must be greater than zero.");

            var hall = await _db.Halls.FindAsync(request.HallId)
                ?? throw new KeyNotFoundException($"Hall {request.HallId} not found.");

            if (hall.Status == HallStatus.Maintenance)
                throw new InvalidOperationException(
                    $"Hall '{hall.Name}' is under maintenance and cannot be booked.");

            if (request.AttendeeCount > hall.Capacity)
                throw new InvalidOperationException(
                    $"Hall '{hall.Name}' seats {hall.Capacity}, but {request.AttendeeCount} attendees were requested.");

            // Reject double-booking: any active booking on this hall that
            // overlaps the requested window blocks the new one.
            var clash = await _db.HallBookings.AnyAsync(b =>
                b.HallId == hall.Id &&
                b.Status != HallBookingStatus.Cancelled &&
                b.StartTime < end &&
                start < b.EndTime);

            if (clash)
                throw new InvalidOperationException(
                    $"Hall '{hall.Name}' is already booked during the requested time.");

            var booking = new HallBooking
            {
                HallId = hall.Id,
                CustomerName = request.CustomerName.Trim(),
                CustomerPhone = request.CustomerPhone.Trim(),
                Purpose = string.IsNullOrWhiteSpace(request.Purpose) ? null : request.Purpose.Trim(),
                AttendeeCount = request.AttendeeCount,
                StartTime = start,
                EndTime = end,
                TotalPrice = CalculatePrice(hall.HourlyRate, start, end),
                Status = HallBookingStatus.Pending
            };

            _db.HallBookings.Add(booking);
            await _db.SaveChangesAsync();

            booking.Hall = hall;
            return ToDto(booking);
        }

        public async Task<List<HallBookingDto>> GetActiveBookingsAsync()
        {
            return await _db.HallBookings
                .Include(b => b.Hall)
                .Where(b => b.Status == HallBookingStatus.Pending ||
                            b.Status == HallBookingStatus.Confirmed)
                .OrderBy(b => b.StartTime)
                .Select(b => new HallBookingDto(
                    b.Id,
                    b.HallId,
                    b.Hall.Name,
                    b.CustomerName,
                    b.CustomerPhone,
                    b.Purpose,
                    b.AttendeeCount,
                    b.StartTime,
                    b.EndTime,
                    b.TotalPrice,
                    b.Status.ToString(),
                    b.CreatedAt))
                .ToListAsync();
        }

        public async Task<HallBookingDto> ConfirmBookingAsync(int bookingId)
        {
            var booking = await GetWithHallAsync(bookingId);

            if (booking.Status != HallBookingStatus.Pending)
                throw new InvalidOperationException("Only pending bookings can be confirmed.");

            booking.Status = HallBookingStatus.Confirmed;
            await _db.SaveChangesAsync();
            return ToDto(booking);
        }

        public async Task<HallBookingDto> CancelBookingAsync(int bookingId)
        {
            var booking = await GetWithHallAsync(bookingId);

            if (booking.Status is HallBookingStatus.Cancelled or HallBookingStatus.Completed)
                throw new InvalidOperationException(
                    $"A {booking.Status.ToString().ToLowerInvariant()} booking cannot be cancelled.");

            booking.Status = HallBookingStatus.Cancelled;
            await _db.SaveChangesAsync();
            return ToDto(booking);
        }

        public async Task<HallBookingDto> CompleteBookingAsync(int bookingId)
        {
            var booking = await GetWithHallAsync(bookingId);

            if (booking.Status is HallBookingStatus.Cancelled or HallBookingStatus.Completed)
                throw new InvalidOperationException(
                    $"A {booking.Status.ToString().ToLowerInvariant()} booking cannot be completed.");

            booking.Status = HallBookingStatus.Completed;
            await _db.SaveChangesAsync();
            return ToDto(booking);
        }

        private async Task<HallBooking> GetWithHallAsync(int bookingId) =>
            await _db.HallBookings
                .Include(b => b.Hall)
                .FirstOrDefaultAsync(b => b.Id == bookingId)
            ?? throw new KeyNotFoundException($"Hall booking {bookingId} not found.");

        // Billed per started hour, minimum one hour.
        private static decimal CalculatePrice(decimal hourlyRate, DateTime start, DateTime end)
        {
            var hours = (int)Math.Ceiling((end - start).TotalHours);
            if (hours < 1) hours = 1;
            return hourlyRate * hours;
        }

        // Npgsql maps DateTime to "timestamp with time zone", which requires a
        // UTC kind. JSON dates often arrive as Unspecified, so normalise here.
        public static DateTime AsUtc(DateTime dt) =>
            dt.Kind switch
            {
                DateTimeKind.Utc => dt,
                DateTimeKind.Local => dt.ToUniversalTime(),
                _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            };

        private static HallBookingDto ToDto(HallBooking b) => new(
            b.Id,
            b.HallId,
            b.Hall.Name,
            b.CustomerName,
            b.CustomerPhone,
            b.Purpose,
            b.AttendeeCount,
            b.StartTime,
            b.EndTime,
            b.TotalPrice,
            b.Status.ToString(),
            b.CreatedAt
        );
    }
}
