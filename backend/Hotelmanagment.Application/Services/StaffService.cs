using Hotelmanagment.Application.DTOs.Staff;
using Hotelmanagment.Application.Interfaces;
using Hotelmanagment.Domain.Entities;
using Hotelmanagment.Domain.Enums;
using Hotelmanagment.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Hotelmanagment.Application.Services
{
    public class StaffService : IStaffService
    {
        private readonly HotelDbContext _db;

        public StaffService(HotelDbContext db) => _db = db;

        public async Task<List<StaffDto>> GetAllAsync()
        {
            var staff = await _db.Staff
                .Include(s => s.Roles)
                .OrderBy(s => s.Id)
                .ToListAsync();

            return staff.Select(ToDto).ToList();
        }

        public async Task<StaffDto> CreateAsync(CreateStaffRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
                throw new InvalidOperationException("Full name is required.");
            if (string.IsNullOrWhiteSpace(request.Username))
                throw new InvalidOperationException("Username is required.");
            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
                throw new InvalidOperationException("Password must be at least 6 characters.");

            var roles = ParseRoles(request.Roles);

            var username = request.Username.Trim().ToLowerInvariant();
            if (await _db.Staff.AnyAsync(s => s.Username == username))
                throw new InvalidOperationException($"Username '{username}' is already taken.");

            var staff = new Staff
            {
                FullName = request.FullName.Trim(),
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                IsActive = true,
                Roles = roles.Select(r => new StaffRoleAssignment { Role = r }).ToList()
            };

            _db.Staff.Add(staff);
            await _db.SaveChangesAsync();

            return ToDto(staff);
        }

        public async Task<StaffDto> UpdateRolesAsync(int staffId, IReadOnlyCollection<string> roles)
        {
            var staff = await _db.Staff
                .Include(s => s.Roles)
                .FirstOrDefaultAsync(s => s.Id == staffId)
                ?? throw new KeyNotFoundException($"Staff {staffId} not found.");

            var parsed = ParseRoles(roles);

            _db.RemoveRange(staff.Roles);
            staff.Roles = parsed.Select(r => new StaffRoleAssignment { StaffId = staff.Id, Role = r }).ToList();

            await _db.SaveChangesAsync();
            return ToDto(staff);
        }

        public async Task<StaffDto> SetActiveAsync(int staffId, bool isActive)
        {
            var staff = await _db.Staff
                .Include(s => s.Roles)
                .FirstOrDefaultAsync(s => s.Id == staffId)
                ?? throw new KeyNotFoundException($"Staff {staffId} not found.");

            staff.IsActive = isActive;
            await _db.SaveChangesAsync();
            return ToDto(staff);
        }

        private static HashSet<StaffRole> ParseRoles(IEnumerable<string>? input)
        {
            if (input is null) throw new InvalidOperationException("At least one role is required.");

            var set = new HashSet<StaffRole>();
            foreach (var raw in input)
            {
                if (string.IsNullOrWhiteSpace(raw)) continue;
                if (!Enum.TryParse<StaffRole>(raw, ignoreCase: true, out var parsed))
                    throw new InvalidOperationException($"'{raw}' is not a valid role.");
                set.Add(parsed);
            }

            if (set.Count == 0)
                throw new InvalidOperationException("At least one role is required.");

            return set;
        }

        private static StaffDto ToDto(Staff s) => new(
            s.Id,
            s.FullName,
            s.Username,
            s.Roles.Select(r => r.Role.ToString()).OrderBy(x => x).ToList(),
            s.IsActive
        );
    }
}
