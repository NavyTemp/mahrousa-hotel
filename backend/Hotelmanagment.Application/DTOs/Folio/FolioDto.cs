using System;
using System.Collections.Generic;

namespace Hotelmanagment.Application.DTOs.Folio
{
    public record FolioLineDto(
        int Id,
        string LineType,
        string Description,
        decimal Amount,
        DateTime CreatedAt
    );

    public record FolioDto(
        int Id,
        int ReservationId,
        string GuestName,
        string GuestPhone,
        string RoomNumber,
        string RoomType,
        decimal PricePerNight,
        DateTime CheckInDate,
        DateTime CheckOutDate,
        int Nights,
        bool IsPaid,
        decimal Total,
        DateTime CreatedAt,
        string? PaymentProofPath,
        List<FolioLineDto> Lines
    );
}
