using Hotelmanagment.Application.DTOs.HallBookings;
using Hotelmanagment.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hotelmanagment.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Reception,Admin")]
    public class HallBookingsController : ControllerBase
    {
        private readonly IHallBookingService _hallBookingService;

        public HallBookingsController(IHallBookingService hallBookingService) =>
            _hallBookingService = hallBookingService;

        [HttpGet]
        public async Task<IActionResult> GetActive() =>
            Ok(await _hallBookingService.GetActiveBookingsAsync());

        [HttpPost]
        public async Task<IActionResult> Create(CreateHallBookingRequest request)
        {
            var result = await _hallBookingService.CreateBookingAsync(request);
            return CreatedAtAction(nameof(GetActive), result);
        }

        [HttpPost("{id}/confirm")]
        public async Task<IActionResult> Confirm(int id) =>
            Ok(await _hallBookingService.ConfirmBookingAsync(id));

        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(int id) =>
            Ok(await _hallBookingService.CancelBookingAsync(id));

        [HttpPost("{id}/complete")]
        public async Task<IActionResult> Complete(int id) =>
            Ok(await _hallBookingService.CompleteBookingAsync(id));
    }
}
