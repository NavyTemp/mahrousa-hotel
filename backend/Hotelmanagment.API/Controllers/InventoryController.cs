using Hotelmanagment.Application.DTOs.Inventory;
using Hotelmanagment.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService) =>
        _inventoryService = inventoryService;

    [HttpGet]
    [Authorize(Roles = "RoomService,Admin")]
    public async Task<IActionResult> GetAll() =>
        Ok(await _inventoryService.GetAllItemsAsync());

    [HttpPost("use")]
    [Authorize(Roles = "RoomService,Admin")]
    public async Task<IActionResult> UseItem(UseInventoryRequest request)
    {
        var staffId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _inventoryService.UseItemAsync(request, staffId);
        return Ok(new { message = "Inventory usage logged." });
    }

    [HttpPost("restock")]
    [Authorize(Roles = "RoomService,Admin")]
    public async Task<IActionResult> Restock(RestockInventoryRequest request)
    {
        var staffId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var updated = await _inventoryService.RestockItemAsync(request, staffId);
        return Ok(updated);
    }

    [HttpGet("restock-logs")]
    [Authorize(Roles = "RoomService,Admin")]
    public async Task<IActionResult> GetRestockLogs([FromQuery] int take = 50) =>
        Ok(await _inventoryService.GetRestockLogsAsync(take));

    [HttpGet("usage-logs")]
    [Authorize(Roles = "RoomService,Admin")]
    public async Task<IActionResult> GetUsageLogs([FromQuery] int take = 50) =>
        Ok(await _inventoryService.GetUsageLogsAsync(take));
}