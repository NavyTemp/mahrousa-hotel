using Hotelmanagment.Application.DTOs.Reservations;
using Hotelmanagment.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hotelmanagment.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReservationsController : ControllerBase
    {
        private readonly IReservationService _reservationService;

        public ReservationsController(IReservationService reservationService) =>
            _reservationService = reservationService;

        [HttpGet]
        [Authorize(Roles = "Reception,Admin")]
        public async Task<IActionResult> GetActive() =>
            Ok(await _reservationService.GetActiveReservationsAsync());

        [HttpPost("phone")]
        [Authorize(Roles = "Reception,Admin")]
        public async Task<IActionResult> PhoneBooking(PhoneReservationRequest request)
        {
            var result = await _reservationService.CreatePhoneReservationAsync(request);
            return CreatedAtAction(nameof(GetActive), result);
        }

        [HttpPost("checkin")]
        [Authorize(Roles = "Reception,Admin")]
        public async Task<IActionResult> CheckIn(CheckInRequest request)
        {
            var result = await _reservationService.CheckInAsync(request);
            return Ok(result);
        }
    }
}
