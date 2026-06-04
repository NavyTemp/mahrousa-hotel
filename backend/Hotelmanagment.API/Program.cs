using HotelManagement.Infrastructure.Persistence;
using Hotelmanagment.API.Middleware;
using Hotelmanagment.Application.Interfaces;
using Hotelmanagment.Application.Services;
using Hotelmanagment.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ── Database ──────────────────────────────────────────────────────────────
builder.Services.AddDbContext<HotelDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// ── Application services ──────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<IHallService, HallService>();
builder.Services.AddScoped<IHallBookingService, HallBookingService>();
builder.Services.AddScoped<IReservationService, ReservationService>();
builder.Services.AddScoped<IFolioService, FolioService>();          
builder.Services.AddScoped<IRestaurantService, RestaurantService>(); 
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IStaffService, StaffService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();

// ── JWT authentication ────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]!;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

// ── Swagger with JWT support ──────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── Build ─────────────────────────────────────────────────────────────────
// Bind Kestrel to a specific IP/port. You can override via configuration or
// the ASPNETCORE_URLS environment variable. Default: http://192.168.1.10:5199
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://localhost:3001",
                "http://192.168.1.10:3000",
                "http://192.168.1.10:3001"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});
builder.WebHost.UseUrls("http://0.0.0.0:5199");

var app = builder.Build();

// ── Migrate + seed on startup ─────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<HotelDbContext>();
    db.Database.Migrate();
    SeedData.Seed(db);
}

// ── Middleware pipeline ───────────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();