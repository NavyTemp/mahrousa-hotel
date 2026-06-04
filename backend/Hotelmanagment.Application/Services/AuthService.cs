using Hotelmanagment.Application.DTOs;
using Hotelmanagment.Application.Interfaces;
using Hotelmanagment.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;

namespace Hotelmanagment.Application.Services
{
    public class AuthService(HotelDbContext _db, IConfiguration _config)
        : IAuthService
    {
        public async Task<LoginResponse?> LoginAsync(LoginRequest request)
        {
            var staff = await _db.Staff
                                 .Include(s => s.Roles)
                                 .FirstOrDefaultAsync(s => s.Username == request.Username && s.IsActive);

            if (staff is null || !BCrypt.Net.BCrypt.Verify(request.Password, staff.PasswordHash))
                return null;

            var roles = staff.Roles.Select(r => r.Role.ToString()).ToList();
            var token = GenerateToken(staff.Id, staff.FullName, roles);

            return new LoginResponse(token, staff.FullName, roles, staff.Id);
        }

        private string GenerateToken(int id, string fullName, IReadOnlyCollection<string> roles)
        {
            var key = new SymmetricSecurityKey(
                          Encoding.UTF8.GetBytes(_config["Jwt:Key"]!)
                          );

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, id.ToString()),
                new(ClaimTypes.Name, fullName),
            };
            // Emit one Role claim per assignment so [Authorize(Roles = "X")] matches any.
            claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(12),
                signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
