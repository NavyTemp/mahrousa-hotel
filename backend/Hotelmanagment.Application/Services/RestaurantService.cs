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
    public class RestaurantService : IRestaurantService
    {
        private readonly HotelDbContext _db;

        public RestaurantService(HotelDbContext db) => _db = db;

        public async Task AddChargeAsync(AddRestaurantChargeRequest request)
        {
            if (request.Amount <= 0)
                throw new InvalidOperationException("Charge amount must be greater than zero.");

            var folio = await _db.GuestFolios
                .Include(f => f.Reservation)
                    .ThenInclude(r => r.Room)
                .FirstOrDefaultAsync(f =>
                    f.Reservation.Room != null &&
                    f.Reservation.Room.RoomNumber == request.RoomNumber && !f.IsPaid)
                ?? throw new KeyNotFoundException(
                    $"No active folio found for room {request.RoomNumber}. " +
                    "Make sure the guest is checked in.");

            folio.Lines.Add(new FolioLine
            {
                FolioId = folio.Id,
                LineType = FolioLineType.RestaurantCharge,
                Description = request.Description,
                Amount = request.Amount
            });

            await _db.SaveChangesAsync();
        }
    }
}
