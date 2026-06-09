using Hotelmanagment.Application.DTOs.Rooms;

namespace Hotelmanagment.Application.Interfaces
{
    public interface IRoomFeatureService
    {
        Task<List<RoomFeatureDto>> GetByRoomAsync(int roomId);
        Task<RoomFeatureDto> UpsertAsync(int roomId, UpsertRoomFeatureRequest request);
        Task DeleteAsync(int roomId, int featureId);
    }
}
