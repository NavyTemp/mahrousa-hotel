using Hotelmanagment.Application.DTOs.Rooms;
using Hotelmanagment.Application.Interfaces;
using Hotelmanagment.Domain.Entities;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Hotelmanagment.Application.Services
{
    public class RoomFeatureService : IRoomFeatureService
    {
        private readonly HotelDbContext _db;

        public RoomFeatureService(HotelDbContext db) => _db = db;

        public async Task<List<RoomFeatureDto>> GetByRoomAsync(int roomId)
        {
            await EnsureRoomExistsAsync(roomId);

            return await _db.Set<RoomFeature>()
                .Where(f => f.RoomId == roomId)
                .OrderBy(f => f.Type)
                .Select(f => new RoomFeatureDto(f.Id, f.Type.ToString(), f.Quantity, f.Notes))
                .ToListAsync();
        }

        public async Task<RoomFeatureDto> UpsertAsync(int roomId, UpsertRoomFeatureRequest request)
        {
            if (request.Quantity <= 0)
                throw new InvalidOperationException("Quantity must be greater than zero.");

            if (request.Notes is { Length: > 200 })
                throw new InvalidOperationException("Notes cannot exceed 200 characters.");

            if (!Enum.TryParse<RoomFeatureType>(request.Type, ignoreCase: true, out var type))
                throw new InvalidOperationException($"'{request.Type}' is not a valid room feature type.");

            await EnsureRoomExistsAsync(roomId);

            // One row per (RoomId, Type): re-using a feature type updates the
            // existing row rather than creating a duplicate. The DB has a
            // unique index, so this also defends against a concurrent insert.
            var existing = await _db.Set<RoomFeature>()
                .FirstOrDefaultAsync(f => f.RoomId == roomId && f.Type == type);

            if (existing is null)
            {
                existing = new RoomFeature
                {
                    RoomId = roomId,
                    Type = type,
                    Quantity = request.Quantity,
                    Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim()
                };
                _db.Add(existing);
            }
            else
            {
                existing.Quantity = request.Quantity;
                existing.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
            }

            await _db.SaveChangesAsync();

            return new RoomFeatureDto(existing.Id, existing.Type.ToString(),
                                      existing.Quantity, existing.Notes);
        }

        public async Task DeleteAsync(int roomId, int featureId)
        {
            var feature = await _db.Set<RoomFeature>()
                .FirstOrDefaultAsync(f => f.Id == featureId && f.RoomId == roomId)
                ?? throw new KeyNotFoundException(
                    $"Feature {featureId} does not belong to room {roomId}.");

            _db.Remove(feature);
            await _db.SaveChangesAsync();
        }

        private async Task EnsureRoomExistsAsync(int roomId)
        {
            var exists = await _db.Rooms.AnyAsync(r => r.Id == roomId);
            if (!exists)
                throw new KeyNotFoundException($"Room {roomId} not found.");
        }
    }
}
