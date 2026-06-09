using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Hotelmanagment.Application.DTOs;

namespace Hotelmanagment.IntegrationTests.Infrastructure;

public static class HttpClientExtensions
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Logs in via /api/auth/login and attaches the resulting JWT as the
    /// default Authorization header on this client.
    /// </summary>
    public static async Task<LoginResponse> AuthenticateAsAsync(
        this HttpClient client, TestAccounts.Account account)
    {
        var resp = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(account.Username, account.Password));

        resp.EnsureSuccessStatusCode();

        var body = await resp.Content.ReadFromJsonAsync<LoginResponse>(JsonOpts)
            ?? throw new InvalidOperationException("Login returned an empty body.");

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", body.Token);

        return body;
    }

    public static async Task<T> ReadJsonAsync<T>(this HttpResponseMessage resp)
    {
        var body = await resp.Content.ReadFromJsonAsync<T>(JsonOpts);
        return body ?? throw new InvalidOperationException(
            $"Response body did not deserialise to {typeof(T).Name}.");
    }

    /// <summary>
    /// Convenience: reads <c>{ message: "..." }</c> error envelopes set by
    /// <c>ExceptionHandlingMiddleware</c>.
    /// </summary>
    public static async Task<string?> ReadErrorMessageAsync(this HttpResponseMessage resp)
    {
        try
        {
            var body = await resp.Content.ReadFromJsonAsync<ErrorEnvelope>(JsonOpts);
            return body?.Message;
        }
        catch
        {
            return null;
        }
    }

    private record ErrorEnvelope(string? Message);
}
