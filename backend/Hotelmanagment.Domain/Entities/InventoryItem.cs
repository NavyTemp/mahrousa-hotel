using Hotelmanagment.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Domain.Entities
{
    public class InventoryItem
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public InventoryCategory Category { get; set; } = InventoryCategory.SelfCare;

        public ICollection<InventoryUsageLog> UsageLogs { get; set; } = new List<InventoryUsageLog>();
        public ICollection<InventoryRestockLog> RestockLogs { get; set; } = new List<InventoryRestockLog>();
    }
}
