using Hotelmanagment.Application.DTOs.Inventory;
using Hotelmanagment.Application.Interfaces;
using Hotelmanagment.Domain.Entities;
using Hotelmanagment.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.Services
{
    public class InventoryService : IInventoryService
    {
        private readonly HotelDbContext _db;

        public InventoryService(HotelDbContext db) => _db = db;
        public async Task<List<InventoryItemDto>> GetAllItemsAsync()
        {
            return await _db.InventoryItems
                .OrderBy(i => i.Category)
                .ThenBy(i => i.Name)
                .Select(i => new InventoryItemDto(
                    i.Id,
                    i.Name,
                    i.Quantity,
                    i.Category.ToString()
                ))
                .ToListAsync();
        }

        public async Task UseItemAsync(UseInventoryRequest request, int staffId)
        {
            if (request.Quantity <= 0)
                throw new InvalidOperationException("Quantity must be greater than zero.");

            var item = await _db.InventoryItems.FindAsync(request.ItemId)
                ?? throw new KeyNotFoundException($"Inventory item {request.ItemId} not found.");

            var room = await _db.Rooms.FindAsync(request.RoomId)
                ?? throw new KeyNotFoundException($"Room {request.RoomId} not found.");

            if (item.Quantity < request.Quantity)
                throw new InvalidOperationException(
                    $"Not enough stock. Available: {item.Quantity}, Requested: {request.Quantity}.");

            item.Quantity -= request.Quantity;

            _db.InventoryUsageLogs.Add(new InventoryUsageLog
            {
                ItemId = item.Id,
                RoomId = room.Id,
                StaffId = staffId,
                QuantityUsed = request.Quantity
            });

            await _db.SaveChangesAsync();
        }

        public async Task<InventoryItemDto> RestockItemAsync(
            RestockInventoryRequest request, int staffId)
        {
            if (request.Quantity <= 0)
                throw new InvalidOperationException("Quantity must be greater than zero.");

            // Guard against accidental huge bumps that look like a typo.
            if (request.Quantity > 10_000)
                throw new InvalidOperationException("Quantity is unreasonably large.");

            var item = await _db.InventoryItems.FindAsync(request.ItemId)
                ?? throw new KeyNotFoundException($"Inventory item {request.ItemId} not found.");

            item.Quantity += request.Quantity;

            _db.InventoryRestockLogs.Add(new InventoryRestockLog
            {
                ItemId        = item.Id,
                StaffId       = staffId,
                QuantityAdded = request.Quantity,
            });

            await _db.SaveChangesAsync();

            return new InventoryItemDto(item.Id, item.Name, item.Quantity, item.Category.ToString());
        }

        public async Task<List<InventoryRestockLogDto>> GetRestockLogsAsync(int take = 50)
        {
            if (take <= 0) take = 50;
            if (take > 500) take = 500;

            return await _db.InventoryRestockLogs
                .OrderByDescending(l => l.AddedAt)
                .Take(take)
                .Select(l => new InventoryRestockLogDto(
                    l.Id,
                    l.ItemId,
                    l.Item.Name,
                    l.StaffId,
                    l.Staff.FullName,
                    l.QuantityAdded,
                    l.AddedAt
                ))
                .ToListAsync();
        }

        public async Task<List<InventoryUsageLogDto>> GetUsageLogsAsync(int take = 50)
        {
            if (take <= 0) take = 50;
            if (take > 500) take = 500;

            return await _db.InventoryUsageLogs
                .OrderByDescending(l => l.UsedAt)
                .Take(take)
                .Select(l => new InventoryUsageLogDto(
                    l.Id,
                    l.ItemId,
                    l.Item.Name,
                    l.RoomId,
                    l.Room.RoomNumber,
                    l.StaffId,
                    l.Staff.FullName,
                    l.QuantityUsed,
                    l.UsedAt
                ))
                .ToListAsync();
        }
    }
}
