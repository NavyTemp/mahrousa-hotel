using System.Net;
using System.Net.Http.Headers;
using Hotelmanagment.Application.DTOs.HallBookings;
using Hotelmanagment.Application.DTOs.Halls;
using Hotelmanagment.IntegrationTests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Hotelmanagment.IntegrationTests.CrossCutting;

public class CrossCuttingTests : IntegrationTestBase
{
    public CrossCuttingTests(HotelApiFactory factory) : base(factory) { }

    // ── ExceptionHandlingMiddleware ──────────────────────────────────────

    [Fact]
    public async Task UnknownResource_Returns_404_With_MessageEnvelope()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);

        var resp = await client.PatchAsJsonAsync("/api/halls/99999/status",
            new UpdateHallStatusRequest("Available"));

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var msg = await resp.ReadErrorMessageAsync();
        msg.Should().NotBeNullOrEmpty();
        resp.Content.Headers.ContentType?.MediaType.Should().Be("application/json");
    }

    [Fact]
    public async Task BusinessRuleViolation_Returns_400_With_MessageEnvelope()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var hallId = await WithDbAsync(async db => (await db.Halls.FirstAsync()).Id);
        var start = DateTime.UtcNow.AddDays(-1);

        var resp = await client.PostAsJsonAsync("/api/hallbookings",
            new CreateHallBookingRequest(hallId, "x", "+1", 10, start, start.AddHours(1), null));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resp.ReadErrorMessageAsync()).Should().NotBeNullOrEmpty();
    }

    // ── JWT edge cases ───────────────────────────────────────────────────

    [Fact]
    public async Task TamperedToken_Returns_401()
    {
        var client = await ClientAsAsync(TestAccounts.Admin);
        var existing = client.DefaultRequestHeaders.Authorization!;
        // Flip the last char of the token so the signature no longer verifies.
        var bad = existing.Parameter!;
        bad = bad[..^1] + (bad[^1] == 'a' ? 'b' : 'a');
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bad);

        var resp = await client.GetAsync("/api/dashboard/snapshot");

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task MissingBearer_Returns_401()
    {
        var client = AnonymousClient();
        var resp = await client.GetAsync("/api/dashboard/snapshot");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task BearerWithoutMatchingRole_Returns_403()
    {
        var client = await ClientAsAsync(TestAccounts.Restaurant);
        var resp = await client.GetAsync("/api/dashboard/snapshot");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── UTC date handling ────────────────────────────────────────────────

    [Fact]
    public async Task UnspecifiedKindDates_AreNormalisedAsUtc()
    {
        var client = await ClientAsAsync(TestAccounts.Reception);
        var hallId = await WithDbAsync(async db => (await db.Halls.FirstAsync()).Id);

        var unspecified = DateTime.SpecifyKind(DateTime.UtcNow.AddDays(3), DateTimeKind.Unspecified);
        var resp = await client.PostAsJsonAsync("/api/hallbookings",
            new CreateHallBookingRequest(hallId, "Cust", "+1", 10,
                unspecified, unspecified.AddHours(2), null));

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    // ── CORS ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task PreflightFromAllowedOrigin_ReturnsAllowOriginHeader()
    {
        var client = AnonymousClient();
        using var req = new HttpRequestMessage(HttpMethod.Options, "/api/auth/login");
        req.Headers.Add("Origin", "http://localhost:3000");
        req.Headers.Add("Access-Control-Request-Method", "POST");
        req.Headers.Add("Access-Control-Request-Headers", "content-type");

        var resp = await client.SendAsync(req);

        resp.Headers.TryGetValues("Access-Control-Allow-Origin", out var allowed)
            .Should().BeTrue();
        allowed!.Should().Contain("http://localhost:3000");
    }

    [Fact]
    public async Task PreflightFromDisallowedOrigin_DoesNotEchoOrigin()
    {
        var client = AnonymousClient();
        using var req = new HttpRequestMessage(HttpMethod.Options, "/api/auth/login");
        req.Headers.Add("Origin", "http://evil.example.com");
        req.Headers.Add("Access-Control-Request-Method", "POST");

        var resp = await client.SendAsync(req);

        // CORS middleware simply omits the allow-origin header for unknown origins.
        resp.Headers.TryGetValues("Access-Control-Allow-Origin", out var allowed)
            .Should().BeFalse();
    }
}
