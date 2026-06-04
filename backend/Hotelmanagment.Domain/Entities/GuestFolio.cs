using HotelManagement.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Domain.Entities
{
    public class GuestFolio
    {
        public int Id { get; set; }

        public int ReservationId { get; set; }
        public Reservation Reservation { get; set; } = null!;

        public bool IsPaid { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? PaidAt { get; set; }

        // Relative path to the uploaded payment-proof image, set when
        // the cashier confirms payment. Stored under the API content root
        // (e.g. "uploads/payments/folio-12-abc.jpg").
        public string? PaymentProofPath { get; set; }

        public ICollection<FolioLine> Lines { get; set; } = new List<FolioLine>();

        public decimal Total => Lines.Sum(l => l.Amount);
    }
}
