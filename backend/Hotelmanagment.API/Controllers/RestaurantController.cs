using Hotelmanagment.Application.DTOs.Folio;
using Hotelmanagment.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RestaurantController : ControllerBase
{
    private readonly IRestaurantService _restaurantService;

    public RestaurantController(IRestaurantService restaurantService) =>
        _restaurantService = restaurantService;

    [HttpPost("charge")]
    [Authorize(Roles = "Restaurant,Admin")]
    public async Task<IActionResult> AddCharge(AddRestaurantChargeRequest request)
    {
        await _restaurantService.AddChargeAsync(request);
        return Ok(new { message = "Charge added to guest folio." });
    }
}