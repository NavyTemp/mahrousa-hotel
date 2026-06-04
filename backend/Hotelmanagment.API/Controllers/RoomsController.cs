using Hotelmanagment.Application.DTOs.Rooms;
using Hotelmanagment.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hotelmanagment.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RoomsController : ControllerBase
    {
        private readonly IRoomService _roomService;

        public RoomsController(IRoomService roomService) => _roomService = roomService;

        [HttpGet]
        public async Task<IActionResult> GetAll() =>
            Ok(await _roomService.GetAllRoomsAsync());

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "RoomService,Admin")]
        public async Task<IActionResult> UpdateStatus(int id, UpdateRoomStatusRequest request)
        {
            await _roomService.UpdateRoomStatusAsync(id, request.Status);
            return NoContent();
        }
    }
}
