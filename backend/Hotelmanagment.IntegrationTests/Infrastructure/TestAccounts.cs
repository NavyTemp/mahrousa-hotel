namespace Hotelmanagment.IntegrationTests.Infrastructure;

/// <summary>
/// Seeded credentials from <c>SeedData.SeedStaff</c>. Kept in one place so role
/// changes only require an update here.
/// </summary>
public static class TestAccounts
{
    public record Account(string Username, string Password, string Role);

    public static readonly Account Admin       = new("admin",       "admin123",     "Admin");
    public static readonly Account Reception   = new("reception1",  "reception123", "Reception");
    public static readonly Account Cashier     = new("cashier1",    "cashier123",   "Cashier");
    public static readonly Account RoomService = new("roomsvc1",    "roomsvc123",   "RoomService");
    public static readonly Account Restaurant  = new("restaurant1", "rest123",      "Restaurant");
}
