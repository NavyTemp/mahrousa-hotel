using Hotelmanagment.Application.DTOs.Halls;
using Hotelmanagment.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hotelmanagment.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class HallsController : ControllerBase
    {
        private readonly IHallService _hallService;

        public HallsController(IHallService hallService) => _hallService = hallService;

        [HttpGet]
        [Authorize(Roles = "Reception,Admin")]
        public async Task<IActionResult> GetAll() =>
            Ok(await _hallService.GetAllHallsAsync());

        // GET /api/halls/available?start=2026-06-10T09:00:00Z&end=2026-06-10T17:00:00Z
        [HttpGet("available")]
        [Authorize(Roles = "Reception,Admin")]
        public async Task<IActionResult> GetAvailable(
            [FromQuery] DateTime start,
            [FromQuery] DateTime end) =>
            Ok(await _hallService.GetAvailableHallsAsync(start, end));

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "RoomService,Admin")]
        public async Task<IActionResult> UpdateStatus(int id, UpdateHallStatusRequest request)
        {
            await _hallService.UpdateHallStatusAsync(id, request.Status);
            return NoContent();
        }
    }
}
