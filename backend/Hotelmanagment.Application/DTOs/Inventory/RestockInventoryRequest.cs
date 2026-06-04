namespace Hotelmanagment.Application.DTOs.Inventory
{
    /// <summary>
    /// Request to add stock to an existing inventory item.
    /// </summary>
    public record RestockInventoryRequest(
        int ItemId,
        int Quantity
    );
}
