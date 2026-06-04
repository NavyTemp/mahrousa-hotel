using Hotelmanagment.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Hotelmanagment.Domain.Entities
{
    public class Staff
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<StaffRoleAssignment> Roles { get; set; } = new List<StaffRoleAssignment>();

        public IEnumerable<StaffRole> RoleValues => Roles.Select(r => r.Role);
    }
}
