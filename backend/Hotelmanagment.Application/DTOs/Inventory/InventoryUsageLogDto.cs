namespace Hotelmanagment.Application.DTOs.Inventory
{
    /// <summary>
    /// One row in the usage history view: who took how much of which item,
    /// for which room, and when.
    /// </summary>
    public record InventoryUsageLogDto(
        int Id,
        int ItemId,
        string ItemName,
        int RoomId,
        string RoomNumber,
        int StaffId,
        string StaffName,
        int QuantityUsed,
        DateTime UsedAt
    );
}
