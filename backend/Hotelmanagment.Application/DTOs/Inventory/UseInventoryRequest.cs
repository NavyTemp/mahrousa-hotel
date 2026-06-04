using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.DTOs.Inventory
{
    public record UseInventoryRequest(
        int RoomId,
        int ItemId,
        int Quantity
    );
}
