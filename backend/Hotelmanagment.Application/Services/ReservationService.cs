using HotelManagement.Domain.Entities;
using Hotelmanagment.Application.DTOs.Reservations;
using Hotelmanagment.Application.Interfaces;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.Services
{
    public class ReservationService : IReservationService
    {
        private readonly HotelDbContext _db;
        private readonly IFolioService _folioService;
        public ReservationService(HotelDbContext db, IFolioService folioService)
        {
            _db = db;
            _folioService = folioService;
        }

        public async Task<ReservationDto> CheckInAsync(CheckInRequest request)
        {
            var room = await _db.Rooms.FindAsync(request.RoomId)
                ?? throw new KeyNotFoundException($"Room {request.RoomId} not found.");

            if (room.Status != RoomStatus.Available)
                throw new InvalidOperationException(
                    $"Room {room.RoomNumber} is not available (current status: {room.Status}).");

            Guest guest;
            Reservation reservation;

            if (request.ExistingReservationId.HasValue)
            {
                // Convert pending phone reservation → checked in
                reservation = await _db.Reservations
                    .Include(r => r.Guest)
                    .FirstOrDefaultAsync(r => r.Id == request.ExistingReservationId.Value)
                    ?? throw new KeyNotFoundException("Reservation not found.");

                if (reservation.Status != ReservationStatus.Pending)
                    throw new InvalidOperationException("Only pending reservations can be checked in.");

                guest = reservation.Guest;
                reservation.Room = room;
            }
            else
            {
                // Brand new walk-in
                guest = new Guest
                {
                    FullName = request.GuestFullName,
                    Phone = request.GuestPhone,
                    NationalId = request.NationalId
                };
                _db.Guests.Add(guest);

                reservation = new Reservation
                {
                    Guest = guest,
                    Source = ReservationSource.WalkIn,
                    CheckInDate = request.CheckInDate ?? DateTime.UtcNow,
                    CheckOutDate = request.CheckOutDate
                };
                _db.Reservations.Add(reservation);
                reservation.Room = room;
            }

            reservation.Status = ReservationStatus.CheckedIn;
            reservation.ActualCheckIn = DateTime.UtcNow;
            room.Status = RoomStatus.Occupied;

            await _db.SaveChangesAsync();

            await _folioService.CreateFolioForReservationAsync(reservation.Id);
            return ToDto(reservation);
        }

        public async Task<ReservationDto> CreatePhoneReservationAsync(PhoneReservationRequest request)
        {
            var guest = new Guest
            {
                FullName = request.GuestFullName,
                Phone = request.GuestPhone
            };
            _db.Guests.Add(guest);

            var reservation = new Reservation
            {
                Guest = guest,
                Source = ReservationSource.Phone,
                Status = ReservationStatus.Pending,
                CheckInDate = request.CheckInDate,
                CheckOutDate = request.CheckOutDate
            };
            _db.Reservations.Add(reservation);

            await _db.SaveChangesAsync();
            return ToDto(reservation);
        }

        public async Task<List<ReservationDto>> GetActiveReservationsAsync()
        {
            return await _db.Reservations
                .Include(r => r.Guest)
                .Include(r => r.Room)
                .Where(r => r.Status == ReservationStatus.Pending ||
                            r.Status == ReservationStatus.CheckedIn)
                .Select(r => new ReservationDto(
                    r.Id,
                    r.Guest.FullName,
                    r.Guest.Phone,
                    r.Room != null ? r.Room.RoomNumber : null,
                    r.Status.ToString(),
                    r.Source.ToString(),
                    r.CheckInDate,
                    r.CheckOutDate))
                .ToListAsync();
        }

        private static ReservationDto ToDto(Reservation r) => new(
            r.Id,
            r.Guest.FullName,
            r.Guest.Phone,
            r.Room?.RoomNumber,
            r.Status.ToString(),
            r.Source.ToString(),
            r.CheckInDate,
            r.CheckOutDate
        );
    }
}
