using Hotelmanagment.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Domain.Entities
{
    public class FolioLine
    {
        public int Id { get; set; }

        public int FolioId { get; set; }
        public GuestFolio Folio { get; set; } = null!;

        public FolioLineType LineType { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
