using System;
using System.Threading.Tasks;
using Hotelmanagment.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hotelmanagment.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService) =>
            _dashboardService = dashboardService;

        /// <summary>
        /// Returns aggregated activity for the given calendar date (UTC).
        /// Defaults to today when no date is supplied.
        /// </summary>
        [HttpGet("snapshot")]
        public async Task<IActionResult> GetSnapshot([FromQuery] DateOnly? date)
        {
            var target = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var snapshot = await _dashboardService.GetSnapshotAsync(target);
            return Ok(snapshot);
        }
    }
}
