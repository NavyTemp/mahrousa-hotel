using System.Collections.Generic;

namespace Hotelmanagment.Application.DTOs.Staff
{
    public record StaffDto(
        int Id,
        string FullName,
        string Username,
        List<string> Roles,
        bool IsActive
    );
}
