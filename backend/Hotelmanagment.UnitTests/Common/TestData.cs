using HotelManagement.Domain.Entities;
using Hotelmanagment.Domain.Entities;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.Infrastructure.Persistence;

namespace Hotelmanagment.UnitTests.Common;

/// <summary>
/// Reusable entity builders so individual tests stay focused on the rule
/// under test instead of boilerplate setup.
/// </summary>
public static class TestData
{
    public static Hall AddHall(this HotelDbContext db,
        string name = "Ballroom",
        int capacity = 100,
        decimal hourlyRate = 100m,
        HallStatus status = HallStatus.Available)
    {
        var hall = new Hall
        {
            Name = name,
            Capacity = capacity,
            HourlyRate = hourlyRate,
            Status = status
        };
        db.Halls.Add(hall);
        db.SaveChanges();
        return hall;
    }

    public static Room AddRoom(this HotelDbContext db,
        string number = "101",
        RoomType type = RoomType.Single,
        decimal pricePerNight = 50m,
        RoomStatus status = RoomStatus.Available)
    {
        var room = new Room
        {
            RoomNumber = number,
            Type = type,
            PricePerNight = pricePerNight,
            Status = status
        };
        db.Rooms.Add(room);
        db.SaveChanges();
        return room;
    }

    public static Staff AddStaff(this HotelDbContext db,
        string fullName = "Test User",
        string username = "tester",
        string password = "secret123",
        bool isActive = true,
        params StaffRole[] roles)
    {
        var staff = new Staff
        {
            FullName = fullName,
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            IsActive = isActive,
            Roles = (roles.Length == 0 ? new[] { StaffRole.Admin } : roles)
                .Select(r => new StaffRoleAssignment { Role = r })
                .ToList()
        };
        db.Staff.Add(staff);
        db.SaveChanges();
        return staff;
    }

    public static InventoryItem AddInventoryItem(this HotelDbContext db,
        string name = "Towel",
        int quantity = 50,
        InventoryCategory category = InventoryCategory.Linens)
    {
        var item = new InventoryItem
        {
            Name = name,
            Quantity = quantity,
            Category = category
        };
        db.InventoryItems.Add(item);
        db.SaveChanges();
        return item;
    }

    public static (Guest guest, Reservation reservation) AddCheckedInReservation(
        this HotelDbContext db,
        Room room,
        string guestName = "Jane Guest",
        string guestPhone = "+1000",
        int nights = 2)
    {
        var guest = new Guest { FullName = guestName, Phone = guestPhone };
        db.Guests.Add(guest);

        var reservation = new Reservation
        {
            Guest = guest,
            Room = room,
            Source = ReservationSource.WalkIn,
            Status = ReservationStatus.CheckedIn,
            CheckInDate = DateTime.UtcNow.AddDays(-1),
            CheckOutDate = DateTime.UtcNow.AddDays(nights),
            ActualCheckIn = DateTime.UtcNow.AddDays(-1)
        };
        db.Reservations.Add(reservation);
        room.Status = RoomStatus.Occupied;
        db.SaveChanges();
        return (guest, reservation);
    }
}
