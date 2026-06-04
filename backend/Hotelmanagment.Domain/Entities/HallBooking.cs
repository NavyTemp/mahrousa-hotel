using Hotelmanagment.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Domain.Entities
{
    public class HallBooking
    {
        public int Id { get; set; }

        public int HallId { get; set; }
        public Hall Hall { get; set; } = null!;

        // Hall events are usually booked by external customers (weddings,
        // conferences, etc.) who are not necessarily hotel guests, so the
        // contact details are captured directly on the booking instead of
        // going through the Guest table.
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;

        // Free-text description of the event (e.g. "Wedding", "Sales kickoff").
        public string? Purpose { get; set; }
        public int AttendeeCount { get; set; }

        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }

        // Price snapshot taken when the booking is created (billed hours ×
        // hall hourly rate). Stored so later rate changes don't rewrite history.
        public decimal TotalPrice { get; set; }

        public HallBookingStatus Status { get; set; } = HallBookingStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
