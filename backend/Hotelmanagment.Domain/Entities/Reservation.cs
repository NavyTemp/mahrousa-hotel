using Hotelmanagment.Domain.Entities;
using Hotelmanagment.Domain.Enums;

namespace HotelManagement.Domain.Entities;

public class Reservation
{
    public int Id { get; set; }

    public int GuestId { get; set; }
    public Guest Guest { get; set; } = null!;

    public int? RoomId { get; set; }         
    public Room? Room { get; set; }

    public ReservationSource Source { get; set; }
    public ReservationStatus Status { get; set; } = ReservationStatus.Pending;

    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
    public DateTime? ActualCheckIn { get; set; }
    public DateTime? ActualCheckOut { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}