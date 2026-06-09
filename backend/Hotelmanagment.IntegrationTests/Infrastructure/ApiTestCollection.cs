namespace Hotelmanagment.IntegrationTests.Infrastructure;

/// <summary>
/// xUnit collection so all integration tests share one running API instance.
/// Tests run serially within the collection; combined with per-test database
/// reset this keeps tests independent without paying the WebApplicationFactory
/// boot cost every time.
/// </summary>
[CollectionDefinition(Name)]
public class ApiTestCollection : ICollectionFixture<HotelApiFactory>
{
    public const string Name = "ApiTestCollection";
}
