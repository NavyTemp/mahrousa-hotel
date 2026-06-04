using Hotelmanagment.Application.DTOs.Folio;
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
    public class FolioService : IFolioService
    {
        private readonly HotelDbContext _db;

        public FolioService(HotelDbContext db) => _db = db;

        public async Task ConfirmPaymentAsync(int folioId, string paymentProofPath)
        {
            if (string.IsNullOrWhiteSpace(paymentProofPath))
                throw new ArgumentException(
                    "A payment-proof image must be uploaded before confirming payment.",
                    nameof(paymentProofPath));

            var folio = await _db.GuestFolios
            .Include(f => f.Reservation)
                .ThenInclude(r => r.Room)
            .FirstOrDefaultAsync(f => f.Id == folioId)
            ?? throw new KeyNotFoundException("Folio not found.");

            if (folio.IsPaid)
                throw new InvalidOperationException("This folio has already been paid.");

            folio.IsPaid = true;
            folio.PaidAt = DateTime.UtcNow;
            folio.PaymentProofPath = paymentProofPath;

            var reservation = folio.Reservation;
            reservation.Status = ReservationStatus.CheckedOut;
            reservation.ActualCheckOut = DateTime.UtcNow;

            if (reservation.Room is not null)
                reservation.Room.Status = RoomStatus.Dirty;

            await _db.SaveChangesAsync();
        }

        public async Task<FolioDto> CreateFolioForReservationAsync(int reservationId)
        {
            var reservation = await _db.Reservations
                .Include(r => r.Guest)
                .Include(r => r.Room)
                .FirstOrDefaultAsync(r => r.Id == reservationId)
                ?? throw new KeyNotFoundException("Reservation not found.");

            var existing = await _db.GuestFolios
                      .FirstOrDefaultAsync(f => f.ReservationId == reservationId);
            if (existing is not null)
                throw new InvalidOperationException("A folio already exists for this reservation.");

            var nights = (reservation.CheckOutDate - reservation.CheckInDate).Days;
            if (nights <= 0) nights = 1;

            var folio = new GuestFolio
            {
                ReservationId = reservationId,
                Lines = new List<FolioLine>
            {
                    new FolioLine
                    {
                        LineType    = FolioLineType.RoomCharge,
                        Description = $"Room {reservation.Room!.RoomNumber} — {nights} night(s)",
                        Amount      = reservation.Room.PricePerNight * nights
                    }
                }
            };
            _db.GuestFolios.Add(folio);
            await _db.SaveChangesAsync();
            return await GetFolioByReservationIdAsync(reservationId);
        }

        public async Task<FolioDto> GetFolioByGuestIdAsync(int guestId)
        {
            var folio = await _db.GuestFolios
                       .Include(f => f.Lines)
                       .Include(f => f.Reservation)
                           .ThenInclude(r => r.Guest)
                       .Include(f => f.Reservation)
                           .ThenInclude(r => r.Room)
                       .FirstOrDefaultAsync(f =>
                           f.Reservation.GuestId == guestId && !f.IsPaid)
                       ?? throw new KeyNotFoundException($"No active folio found for guest {guestId}.");

            return ToDto(folio);
        }

        public async Task<FolioDto> GetFolioByReservationIdAsync(int reservationId)
        {
            var folio = await _db.GuestFolios
                .Include(f => f.Lines)
                .Include(f => f.Reservation)
                    .ThenInclude(r => r.Guest)
                .Include(f => f.Reservation)
                    .ThenInclude(r => r.Room)
                .FirstOrDefaultAsync(f => f.ReservationId == reservationId)
                ?? throw new KeyNotFoundException("Folio not found.");

            return ToDto(folio);
        }

        public async Task<FolioDto> GetFolioByRoomNumberAsync(string roomNumber)
        {
            var folio = await _db.GuestFolios
                .Include(f => f.Lines)
                .Include(f => f.Reservation)
                    .ThenInclude(r => r.Guest)
                .Include(f => f.Reservation)
                    .ThenInclude(r => r.Room)
                .FirstOrDefaultAsync(f =>
                    f.Reservation.Room != null &&
                    f.Reservation.Room.RoomNumber == roomNumber && !f.IsPaid)
                ?? throw new KeyNotFoundException($"No active folio found for room {roomNumber}.");

            return ToDto(folio);
        }

        private static FolioDto ToDto(GuestFolio f)
        {
            var r = f.Reservation;
            var nights = (r.CheckOutDate - r.CheckInDate).Days;
            if (nights <= 0) nights = 1;

            return new FolioDto(
                f.Id,
                f.ReservationId,
                r.Guest.FullName,
                r.Guest.Phone,
                r.Room?.RoomNumber ?? "—",
                r.Room?.Type.ToString() ?? "—",
                r.Room?.PricePerNight ?? 0m,
                r.CheckInDate,
                r.CheckOutDate,
                nights,
                f.IsPaid,
                f.Lines.Sum(l => l.Amount),
                f.CreatedAt,
                f.PaymentProofPath,
                f.Lines.Select(l => new FolioLineDto(
                    l.Id, l.LineType.ToString(), l.Description, l.Amount, l.CreatedAt
                )).ToList()
            );
        }
    }
}
