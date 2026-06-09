using Hotelmanagment.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Hotelmanagment.UnitTests.Common;

/// <summary>
/// Builds a fresh <see cref="HotelDbContext"/> backed by EF Core's InMemory
/// provider. Each call returns an isolated database so tests can't cross-pollute.
/// </summary>
public static class TestDbFactory
{
    public static HotelDbContext NewDb(string? dbName = null)
    {
        var options = new DbContextOptionsBuilder<HotelDbContext>()
            .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .EnableSensitiveDataLogging()
            .Options;

        return new HotelDbContext(options);
    }
}
