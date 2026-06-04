using System;

namespace Hotelmanagment.Application.DTOs.Dashboard
{
    /// <summary>
    /// Aggregated snapshot of what happened at the hotel on a single calendar date
    /// (UTC). Used by the admin dashboard to look back at past days.
    /// </summary>
    public record DashboardSnapshotDto(
        DateOnly Date,

        // Bookings created on that date
        int BookingsCreated,
        int PhoneBookingsCreated,
        int WalkInBookingsCreated,

        // Movement on that date
        int CheckIns,
        int CheckOuts,

        // State at the end of that date
        int GuestsInHouse,
        int PendingReservations,

        // Money
        decimal RevenueCollected,
        int PaymentsConfirmed,
        decimal ChargesAdded,
        decimal RoomChargesAdded,
        decimal RestaurantChargesAdded,
        decimal OtherChargesAdded,

        // Housekeeping / stock activity
        int InventoryUsageEntries,
        int InventoryRestockEntries,

        // Hall (event space) activity on that date
        int HallBookingsCreated,
        decimal HallBookingsRevenue
    );
}
