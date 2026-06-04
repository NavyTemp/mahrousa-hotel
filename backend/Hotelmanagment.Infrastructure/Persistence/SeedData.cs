using HotelManagement.Domain.Entities;
using Hotelmanagment.Domain.Entities;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.Infrastructure.Persistence;
using System.Linq;

namespace HotelManagement.Infrastructure.Persistence;

public static class SeedData
{
    public static void Seed(HotelDbContext db)
    {
        SeedStaff(db);
        SeedRooms(db);
        SeedHalls(db);
        SeedInventory(db);
    }

    private static void SeedStaff(HotelDbContext db)
    {
        if (db.Staff.Any()) return;

        static Staff Make(string fullName, string username, string password, params StaffRole[] roles) =>
            new()
            {
                FullName = fullName,
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Roles = roles.Select(r => new StaffRoleAssignment { Role = r }).ToList()
            };

        db.Staff.AddRange(
            Make("Admin User",      "admin",       "admin123",     StaffRole.Admin),
            Make("Sara Cashier",    "cashier1",    "cashier123",   StaffRole.Cashier),
            Make("Omar Reception",  "reception1",  "reception123", StaffRole.Reception),
            Make("Layla RoomSvc",   "roomsvc1",    "roomsvc123",   StaffRole.RoomService),
            Make("Ali Restaurant",  "restaurant1", "rest123",      StaffRole.Restaurant)
        );
        db.SaveChanges();
    }

    private static void SeedRooms(HotelDbContext db)
    {
        if (db.Rooms.Any()) return;

        db.Rooms.AddRange(
            new Room { RoomNumber = "101", Type = RoomType.Single, PricePerNight = 50m, Status = RoomStatus.Available },
            new Room { RoomNumber = "102", Type = RoomType.Single, PricePerNight = 50m, Status = RoomStatus.Available },
            new Room { RoomNumber = "201", Type = RoomType.Double, PricePerNight = 90m, Status = RoomStatus.Available },
            new Room { RoomNumber = "202", Type = RoomType.Double, PricePerNight = 90m, Status = RoomStatus.Available },
            new Room { RoomNumber = "301", Type = RoomType.Suite, PricePerNight = 180m, Status = RoomStatus.Available }
        );
        db.SaveChanges();
    }

    private static void SeedHalls(HotelDbContext db)
    {
        if (db.Halls.Any()) return;

        db.Halls.AddRange(
            new Hall { Name = "Grand Ballroom",    Capacity = 300, HourlyRate = 500m, Status = HallStatus.Available },
            new Hall { Name = "Conference Hall A",  Capacity = 80,  HourlyRate = 150m, Status = HallStatus.Available },
            new Hall { Name = "Conference Hall B",  Capacity = 80,  HourlyRate = 150m, Status = HallStatus.Available },
            new Hall { Name = "Meeting Room 1",     Capacity = 20,  HourlyRate = 60m,  Status = HallStatus.Available },
            new Hall { Name = "Rooftop Terrace",    Capacity = 120, HourlyRate = 250m, Status = HallStatus.Available }
        );
        db.SaveChanges();
    }

    private static void SeedInventory(HotelDbContext db)
    {
        // (Name, Category, DefaultQty) — defines the catalog we want to exist.
        // This seed is idempotent: existing items keep their quantity but get
        // their category backfilled; missing items get inserted with DefaultQty.
        var catalog = new (string Name, InventoryCategory Category, int DefaultQty)[]
        {
            // Self care
            ("Shampoo",        InventoryCategory.SelfCare,  100),
            ("Conditioner",    InventoryCategory.SelfCare,   80),
            ("Soap",           InventoryCategory.SelfCare,  150),
            ("Toothpaste",     InventoryCategory.SelfCare,  120),
            ("Toothbrush",     InventoryCategory.SelfCare,  120),
            ("Body Lotion",    InventoryCategory.SelfCare,   60),

            // Linens
            ("Towel",          InventoryCategory.Linens,     50),
            ("Bed Sheet",      InventoryCategory.Linens,     40),
            ("Pillow",         InventoryCategory.Linens,     60),
            ("Pillowcase",     InventoryCategory.Linens,     80),
            ("Blanket",        InventoryCategory.Linens,     30),

            // Bathroom
            ("Toilet Paper",   InventoryCategory.Bathroom,  200),
            ("Tissues",        InventoryCategory.Bathroom,  100),
            ("Hand Soap",      InventoryCategory.Bathroom,   90),

            // Beverages / minibar
            ("Bottled Water",  InventoryCategory.Beverages, 200),
            ("Coffee Sachets", InventoryCategory.Beverages, 150),
            ("Tea Bags",       InventoryCategory.Beverages, 150),

            // Cleaning
            ("Disinfectant",   InventoryCategory.Cleaning,   40),
            ("Glass Cleaner",  InventoryCategory.Cleaning,   30),
            ("Floor Cleaner",  InventoryCategory.Cleaning,   30),
        };

        var existing = db.InventoryItems.ToDictionary(i => i.Name, i => i);
        var changed = false;

        foreach (var (name, category, qty) in catalog)
        {
            if (existing.TryGetValue(name, out var item))
            {
                // Backfill category for legacy rows that predate this field.
                if (item.Category != category)
                {
                    item.Category = category;
                    changed = true;
                }
            }
            else
            {
                db.InventoryItems.Add(new InventoryItem
                {
                    Name = name,
                    Quantity = qty,
                    Category = category,
                });
                changed = true;
            }
        }

        if (changed) db.SaveChanges();
    }
}