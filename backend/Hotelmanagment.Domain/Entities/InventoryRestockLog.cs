using System;

namespace Hotelmanagment.Domain.Entities
{
    /// <summary>
    /// Audit row written every time stock is added to an inventory item.
    /// Captures who added the stock and when, alongside how much was added.
    /// </summary>
    public class InventoryRestockLog
    {
        public int Id { get; set; }

        public int ItemId { get; set; }
        public InventoryItem Item { get; set; } = null!;

        public int StaffId { get; set; }
        public Staff Staff { get; set; } = null!;

        public int QuantityAdded { get; set; }
        public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    }
}
