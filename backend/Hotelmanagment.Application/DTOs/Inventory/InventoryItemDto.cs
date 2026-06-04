using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.DTOs.Inventory
{
    public record InventoryItemDto(
        int Id,
        string Name,
        int Quantity,
        string Category
    );
}
