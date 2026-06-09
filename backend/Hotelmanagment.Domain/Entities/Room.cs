using HotelManagement.Domain.Entities;
using Hotelmanagment.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Domain.Entities
{
    public class Room
    {
        public int Id { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public RoomType Type { get; set; }
        public RoomStatus Status { get; set; } = RoomStatus.Available;
        public decimal PricePerNight { get; set; }

        public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();

        // Physical contents of the room: beds, TV, fridge, AC, etc. Each entry
        // captures one type of feature plus a quantity. See <see cref="RoomFeature"/>.
        public ICollection<RoomFeature> Features { get; set; } = new List<RoomFeature>();
    }
}
