namespace Hotelmanagment.Application.DTOs.Inventory
{
    /// <summary>
    /// One row in the restock history view: who added how much of which item, and when.
    /// </summary>
    public record InventoryRestockLogDto(
        int Id,
        int ItemId,
        string ItemName,
        int StaffId,
        string StaffName,
        int QuantityAdded,
        DateTime AddedAt
    );
}
