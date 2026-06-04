using System;
using System.Linq;
using System.Threading.Tasks;
using Hotelmanagment.Application.DTOs.Dashboard;
using Hotelmanagment.Application.Interfaces;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hotelmanagment.Application.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly HotelDbContext _db;

        public DashboardService(HotelDbContext db) => _db = db;

        public async Task<DashboardSnapshotDto> GetSnapshotAsync(DateOnly date)
        {
            // Treat the requested date as a UTC calendar day [start, end).
            var dayStart = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var dayEnd = dayStart.AddDays(1);

            // ── Bookings created that day (by source) ──────────────────────
            var createdThatDay = _db.Reservations
                .Where(r => r.CreatedAt >= dayStart && r.CreatedAt < dayEnd);

            var bookingsCreated       = await createdThatDay.CountAsync();
            var phoneBookingsCreated  = await createdThatDay.CountAsync(r => r.Source == ReservationSource.Phone);
            var walkInBookingsCreated = await createdThatDay.CountAsync(r => r.Source == ReservationSource.WalkIn);

            // ── Check-ins / check-outs that day ────────────────────────────
            var checkIns = await _db.Reservations
                .CountAsync(r => r.ActualCheckIn  >= dayStart && r.ActualCheckIn  < dayEnd);

            var checkOuts = await _db.Reservations
                .CountAsync(r => r.ActualCheckOut >= dayStart && r.ActualCheckOut < dayEnd);

            // ── State at end of that day ───────────────────────────────────
            // In-house = checked in by end of day, not yet checked out (or
            // checked out after end of day).
            var guestsInHouse = await _db.Reservations.CountAsync(r =>
                r.ActualCheckIn != null &&
                r.ActualCheckIn < dayEnd &&
                (r.ActualCheckOut == null || r.ActualCheckOut >= dayEnd));

            // Pending reservations as-of end of day: created on/before end of
            // day and still in Pending state today.
            var pendingReservations = await _db.Reservations.CountAsync(r =>
                r.CreatedAt < dayEnd &&
                r.Status == ReservationStatus.Pending);

            // ── Money ──────────────────────────────────────────────────────
            var paidThatDay = _db.GuestFolios
                .Where(f => f.IsPaid && f.PaidAt >= dayStart && f.PaidAt < dayEnd);

            var paymentsConfirmed = await paidThatDay.CountAsync();

            // GuestFolio.Total is computed in C# (.Ignore'd in EF mapping), so
            // we sum the underlying lines server-side instead.
            var revenueCollected = await paidThatDay
                .SelectMany(f => f.Lines)
                .SumAsync(l => (decimal?)l.Amount) ?? 0m;

            var chargesThatDay = _db.FolioLines
                .Where(l => l.CreatedAt >= dayStart && l.CreatedAt < dayEnd);

            var chargesAdded            = await chargesThatDay.SumAsync(l => (decimal?)l.Amount) ?? 0m;
            var roomChargesAdded        = await chargesThatDay
                .Where(l => l.LineType == FolioLineType.RoomCharge)
                .SumAsync(l => (decimal?)l.Amount) ?? 0m;
            var restaurantChargesAdded  = await chargesThatDay
                .Where(l => l.LineType == FolioLineType.RestaurantCharge)
                .SumAsync(l => (decimal?)l.Amount) ?? 0m;
            var otherChargesAdded       = await chargesThatDay
                .Where(l => l.LineType == FolioLineType.Other)
                .SumAsync(l => (decimal?)l.Amount) ?? 0m;

            // ── Inventory activity ─────────────────────────────────────────
            var inventoryUsageEntries = await _db.InventoryUsageLogs
                .CountAsync(l => l.UsedAt >= dayStart && l.UsedAt < dayEnd);

            var inventoryRestockEntries = await _db.InventoryRestockLogs
                .CountAsync(l => l.AddedAt >= dayStart && l.AddedAt < dayEnd);

            // ── Hall (event space) activity ────────────────────────────────
            var hallBookingsThatDay = _db.HallBookings
                .Where(b => b.CreatedAt >= dayStart && b.CreatedAt < dayEnd);

            var hallBookingsCreated  = await hallBookingsThatDay.CountAsync();
            var hallBookingsRevenue  = await hallBookingsThatDay
                .Where(b => b.Status != HallBookingStatus.Cancelled)
                .SumAsync(b => (decimal?)b.TotalPrice) ?? 0m;

            return new DashboardSnapshotDto(
                date,
                bookingsCreated,
                phoneBookingsCreated,
                walkInBookingsCreated,
                checkIns,
                checkOuts,
                guestsInHouse,
                pendingReservations,
                revenueCollected,
                paymentsConfirmed,
                chargesAdded,
                roomChargesAdded,
                restaurantChargesAdded,
                otherChargesAdded,
                inventoryUsageEntries,
                inventoryRestockEntries,
                hallBookingsCreated,
                hallBookingsRevenue
            );
        }
    }
}
