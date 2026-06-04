using Hotelmanagment.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Threading.Tasks;

namespace HotelManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FolioController : ControllerBase
{
    private readonly IFolioService _folioService;
    private readonly IWebHostEnvironment _env;

    public FolioController(IFolioService folioService, IWebHostEnvironment env)
    {
        _folioService = folioService;
        _env = env;
    }

    [HttpGet("guest/{guestId}")]
    [Authorize(Roles = "Cashier,Reception,Admin")]
    public async Task<IActionResult> GetByGuest(int guestId) =>
        Ok(await _folioService.GetFolioByGuestIdAsync(guestId));

    [HttpGet("reservation/{reservationId}")]
    [Authorize(Roles = "Cashier,Reception,Admin")]
    public async Task<IActionResult> GetByReservation(int reservationId) =>
        Ok(await _folioService.GetFolioByReservationIdAsync(reservationId));

    [HttpGet("room/{roomNumber}")]
    [Authorize(Roles = "Cashier,Reception,Admin")]
    public async Task<IActionResult> GetByRoom(string roomNumber) =>
        Ok(await _folioService.GetFolioByRoomNumberAsync(roomNumber));

    // Multipart form upload: cashier must attach a payment-proof image
    // (e.g. receipt photo / bank-transfer screenshot) before the folio can
    // be marked paid. We trust the cashier and do NOT inspect the image
    // contents — we just persist it to disk and record the path.
    [HttpPost("{folioId}/confirm-payment")]
    [Authorize(Roles = "Cashier,Admin")]
    [RequestSizeLimit(15 * 1024 * 1024)] // 15 MB ought to be plenty for a phone photo
    public async Task<IActionResult> ConfirmPayment(
        int folioId,
        [FromForm] IFormFile? proof)
    {
        if (proof is null || proof.Length == 0)
            return BadRequest(new
            {
                message = "A payment-proof image is required to confirm payment.",
            });

        // Resolve a stable, app-local upload directory. We use the content
        // root (not wwwroot) so files aren't statically served by default —
        // payment receipts are sensitive.
        var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads", "payments");
        Directory.CreateDirectory(uploadsDir);

        // Keep the original extension if it looks sane; otherwise fall back.
        var ext = Path.GetExtension(proof.FileName);
        if (string.IsNullOrWhiteSpace(ext) || ext.Length > 8) ext = ".img";

        var fileName = $"folio-{folioId}-{Guid.NewGuid():N}{ext}";
        var diskPath = Path.Combine(uploadsDir, fileName);

        await using (var stream = System.IO.File.Create(diskPath))
        {
            await proof.CopyToAsync(stream);
        }

        // Store a forward-slash relative path so it round-trips cleanly
        // across OSes and is safe to expose in the DTO.
        var relativePath = $"uploads/payments/{fileName}";

        await _folioService.ConfirmPaymentAsync(folioId, relativePath);

        return Ok(new
        {
            message   = "Payment confirmed. Guest checked out.",
            proofPath = relativePath,
        });
    }
}
