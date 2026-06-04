using Hotelmanagment.Application.DTOs;
using Hotelmanagment.Application.Interfaces;
using Hotelmanagment.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hotelmanagment.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService) =>
            _authService = authService;


        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);

            if (result is null)
                return Unauthorized(new { message = "Invalid username or password." });

            return Ok(result);
        }
    }
}
