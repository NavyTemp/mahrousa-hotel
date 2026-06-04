using Hotelmanagment.Application.DTOs.Inventory;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.Interfaces
{
    public interface IInventoryService
    {
        Task<List<InventoryItemDto>> GetAllItemsAsync();
        Task UseItemAsync(UseInventoryRequest request, int staffId);
        Task<InventoryItemDto> RestockItemAsync(RestockInventoryRequest request, int staffId);
        Task<List<InventoryRestockLogDto>> GetRestockLogsAsync(int take = 50);
        Task<List<InventoryUsageLogDto>> GetUsageLogsAsync(int take = 50);
    }
}
