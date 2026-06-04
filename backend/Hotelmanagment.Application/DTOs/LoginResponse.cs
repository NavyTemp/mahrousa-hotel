using System.Collections.Generic;

namespace Hotelmanagment.Application.DTOs
{
    public record LoginResponse(string Token, string FullName, List<string> Roles, int StaffId);
}
