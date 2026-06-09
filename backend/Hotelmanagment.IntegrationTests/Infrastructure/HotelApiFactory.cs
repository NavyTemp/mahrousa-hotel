using HotelManagement.Infrastructure.Persistence;
using Hotelmanagment.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Hotelmanagment.IntegrationTests.Infrastructure;

/// <summary>
/// Boots the real <see cref="Program"/> against a dedicated PostgreSQL test
/// database (<c>HotelDB_Test</c>). All EF migrations and seed logic run as in
/// production — only the connection string is swapped.
/// </summary>
public class HotelApiFactory : WebApplicationFactory<Program>
{
    /// <summary>
    /// Connection string for the integration test database. Points at the same
    /// local Postgres instance the dev DB uses, but a separate database name so
    /// tests can wipe data freely without touching dev work.
    /// </summary>
    public const string TestConnectionString =
        "Host=localhost;Port=5432;Database=HotelDB_Test;Username=postgres;Password=password";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration(cfg =>
        {
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = TestConnectionString
            });
        });
    }

    /// <summary>
    /// Drops, re-applies migrations, and seeds <c>HotelDB_Test</c>. Call from a
    /// collection fixture once per test run to guarantee a known baseline.
    /// </summary>
    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HotelDbContext>();

        // Ensure schema matches the latest migration before truncating, so the
        // table list is right after a model change.
        await db.Database.MigrateAsync();

        // Wipe transactional data. RESTART IDENTITY resets serial PKs so IDs
        // don't grow unbounded across runs. CASCADE handles FK chains.
        await db.Database.ExecuteSqlRawAsync("""
            TRUNCATE TABLE
                "InventoryUsageLogs",
                "InventoryRestockLogs",
                "InventoryItems",
                "FolioLines",
                "GuestFolios",
                "HallBookings",
                "Halls",
                "Reservations",
                "Guests",
                "Rooms",
                "StaffRoles",
                "Staff"
            RESTART IDENTITY CASCADE;
        """);

        // Re-insert seed data: 5 staff accounts, rooms, halls, inventory.
        SeedData.Seed(db);
    }
}
