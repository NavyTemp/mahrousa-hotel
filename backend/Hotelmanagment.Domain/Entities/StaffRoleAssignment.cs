using Hotelmanagment.Domain.Enums;

namespace Hotelmanagment.Domain.Entities
{
    public class StaffRoleAssignment
    {
        public int StaffId { get; set; }
        public Staff Staff { get; set; } = null!;

        public StaffRole Role { get; set; }
    }
}
