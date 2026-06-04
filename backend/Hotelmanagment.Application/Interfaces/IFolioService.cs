using Hotelmanagment.Application.DTOs.Folio;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.Interfaces
{
    public interface IFolioService
    {
        Task<FolioDto> GetFolioByGuestIdAsync(int guestId);
        Task<FolioDto> GetFolioByReservationIdAsync(int reservationId);
        Task<FolioDto> GetFolioByRoomNumberAsync(string roomNumber);
        Task ConfirmPaymentAsync(int folioId, string paymentProofPath);
        Task<FolioDto> CreateFolioForReservationAsync(int reservationId);
    }
}
