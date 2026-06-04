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
    }
}
