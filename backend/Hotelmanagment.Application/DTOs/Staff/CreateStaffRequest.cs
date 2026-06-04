using System.Collections.Generic;

namespace Hotelmanagment.Application.DTOs.Staff
{
    public record CreateStaffRequest(
        string FullName,
        string Username,
        string Password,
        List<string> Roles
    );
}
