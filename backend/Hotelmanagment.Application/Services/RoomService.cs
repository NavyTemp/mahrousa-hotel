using Hotelmanagment.Application.DTOs.Rooms;
using Hotelmanagment.Application.Interfaces;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.Services
{
    public class RoomService(HotelDbContext _db) : IRoomService
    {
        public async Task<List<RoomDto>> GetAllRoomsAsync()
        {
            return await _db.Rooms
           .Select(r => new RoomDto(r.Id, r.RoomNumber, r.Type.ToString(), r.Status.ToString(), r.PricePerNight))
           .ToListAsync();
        }

        public async Task UpdateRoomStatusAsync(int roomId, string newStatus)
        {
            var room = await _db.Rooms.FindAsync(roomId)
           ?? throw new KeyNotFoundException($"Room {roomId} not found.");

            if (!Enum.TryParse<RoomStatus>(newStatus, ignoreCase: true, out var parsed))
                throw new InvalidOperationException($"'{newStatus}' is not a valid room status.");

            var allowed = (room.Status, parsed) switch
            {
                (RoomStatus.Available, RoomStatus.Maintenance) => true,
                (RoomStatus.Dirty, RoomStatus.Available) => true,
                (RoomStatus.Dirty, RoomStatus.Maintenance) => true,
                (RoomStatus.Maintenance, RoomStatus.Available) => true,
                _ => false
            };

            if (!allowed)
                throw new InvalidOperationException(
                    $"Cannot transition room from '{room.Status}' to '{parsed}'.");

            room.Status = parsed;
            await _db.SaveChangesAsync();
        }
    }
}
