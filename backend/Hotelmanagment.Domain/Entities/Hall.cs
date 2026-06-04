using Hotelmanagment.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Domain.Entities
{
    public class Hall
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;

        // Maximum number of people the hall can seat. Used to reject bookings
        // whose attendee count exceeds what the space can hold.
        public int Capacity { get; set; }

        // What the front desk charges per booked hour. Stored as numeric(10,2).
        public decimal HourlyRate { get; set; }

        public HallStatus Status { get; set; } = HallStatus.Available;

        public ICollection<HallBooking> Bookings { get; set; } = new List<HallBooking>();
    }
}
