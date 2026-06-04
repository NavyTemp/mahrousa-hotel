using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Domain.Entities
{
    public class InventoryUsageLog
    {
        public int Id { get; set; }

        public int ItemId { get; set; }
        public InventoryItem Item { get; set; } = null!;

        public int RoomId { get; set; }
        public Room Room { get; set; } = null!;

        public int StaffId { get; set; }
        public Staff Staff { get; set; } = null!;

        public int QuantityUsed { get; set; }
        public DateTime UsedAt { get; set; } = DateTime.UtcNow;
    }
}
