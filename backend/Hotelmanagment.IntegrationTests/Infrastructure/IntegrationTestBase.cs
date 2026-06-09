using Hotelmanagment.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Hotelmanagment.IntegrationTests.Infrastructure;

/// <summary>
/// Common scaffolding for integration tests:
/// - Provides the shared <see cref="HotelApiFactory"/>.
/// - Resets the test database before each test for isolation.
/// - Exposes helpers to build clients pre-authenticated as a given role.
/// </summary>
[Collection(ApiTestCollection.Name)]
public abstract class IntegrationTestBase : IAsyncLifetime
{
    protected HotelApiFactory Factory { get; }

    protected IntegrationTestBase(HotelApiFactory factory) => Factory = factory;

    public async Task InitializeAsync() => await Factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    /// <summary>
    /// Returns a fresh HttpClient with no Authorization header.
    /// </summary>
    protected HttpClient AnonymousClient() => Factory.CreateClient();

    /// <summary>
    /// Returns an HttpClient pre-authenticated as the given seeded account.
    /// </summary>
    protected async Task<HttpClient> ClientAsAsync(TestAccounts.Account account)
    {
        var client = Factory.CreateClient();
        await client.AuthenticateAsAsync(account);
        return client;
    }

    /// <summary>
    /// Runs an action inside an EF Core scope so tests can verify or fabricate
    /// database state directly.
    /// </summary>
    protected async Task WithDbAsync(Func<HotelDbContext, Task> action)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HotelDbContext>();
        await action(db);
    }

    protected async Task<T> WithDbAsync<T>(Func<HotelDbContext, Task<T>> action)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HotelDbContext>();
        return await action(db);
    }
}
