using Hotelmanagment.Application.DTOs.Rooms;
using Hotelmanagment.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hotelmanagment.API.Controllers
{
    /// <summary>
    /// Per-room contents — beds, TV, fridge, AC, etc. Anyone signed in can list
    /// what a room has; only Admin can change it. Housekeeping / Room Service
    /// reports breakages or missing items through other channels rather than
    /// editing the room's official contents list.
    /// </summary>
    [ApiController]
    [Route("api/rooms/{roomId:int}/features")]
    [Authorize]
    public class RoomFeaturesController : ControllerBase
    {
        private readonly IRoomFeatureService _service;

        public RoomFeaturesController(IRoomFeatureService service) => _service = service;

        [HttpGet]
        public async Task<IActionResult> GetForRoom(int roomId) =>
            Ok(await _service.GetByRoomAsync(roomId));

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Upsert(int roomId, UpsertRoomFeatureRequest request)
        {
            var saved = await _service.UpsertAsync(roomId, request);
            return Ok(saved);
        }

        [HttpDelete("{featureId:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int roomId, int featureId)
        {
            await _service.DeleteAsync(roomId, featureId);
            return NoContent();
        }
    }
}
