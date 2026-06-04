using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using System.Text.Json;

namespace Hotelmanagment.Infrastructure.Persistence
{
    public class HotelDbContextFactory : IDesignTimeDbContextFactory<HotelDbContext>
    {
        public HotelDbContext CreateDbContext(string[] args)
        {
            var basePath = Directory.GetCurrentDirectory();
            var jsonPath = Path.Combine(basePath, "appsettings.json");

            string? connectionString = null;

            if (File.Exists(jsonPath))
            {
                try
                {
                    using var stream = File.OpenRead(jsonPath);
                    using var doc = JsonDocument.Parse(stream);
                    if (doc.RootElement.TryGetProperty("ConnectionStrings", out var cs) &&
                        cs.TryGetProperty("Default", out var def))
                    {
                        connectionString = def.GetString();
                    }
                }
                catch
                {
                    // ignore parse errors and fall back to environment or defaults
                }
            }

            connectionString ??= Environment.GetEnvironmentVariable("ConnectionStrings__Default")
                                ?? Environment.GetEnvironmentVariable("DefaultConnection");

            // Fallback to a local default if nothing provided (adjust as needed)
            connectionString ??= "Host=localhost;Database=hotel;Username=postgres;Password=postgres";

            var optionsBuilder = new DbContextOptionsBuilder<HotelDbContext>();
            optionsBuilder.UseNpgsql(connectionString);

            return new HotelDbContext(optionsBuilder.Options);
        }
    }
}
