using Hotelmanagment.Application.DTOs.Rooms;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.Interfaces
{
    public interface IRoomService
    {
        Task<List<RoomDto>> GetAllRoomsAsync();
        Task UpdateRoomStatusAsync(int roomId, string newStatus);
    }
}
