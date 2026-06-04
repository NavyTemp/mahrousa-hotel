using Hotelmanagment.Application.DTOs.Staff;
using Hotelmanagment.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class StaffController : ControllerBase
{
    private readonly IStaffService _staffService;

    public StaffController(IStaffService staffService) => _staffService = staffService;

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await _staffService.GetAllAsync());

    [HttpPost]
    public async Task<IActionResult> Create(CreateStaffRequest request)
    {
        var created = await _staffService.CreateAsync(request);
        return CreatedAtAction(nameof(GetAll), new { id = created.Id }, created);
    }

    [HttpPatch("{id}/roles")]
    public async Task<IActionResult> UpdateRoles(int id, UpdateStaffRolesRequest request) =>
        Ok(await _staffService.UpdateRolesAsync(id, request.Roles));

    [HttpPatch("{id}/active")]
    public async Task<IActionResult> SetActive(int id, SetStaffActiveRequest request) =>
        Ok(await _staffService.SetActiveAsync(id, request.IsActive));
}
