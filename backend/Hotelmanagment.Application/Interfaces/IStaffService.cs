using Hotelmanagment.Application.DTOs.Staff;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Hotelmanagment.Application.Interfaces
{
    public interface IStaffService
    {
        Task<List<StaffDto>> GetAllAsync();
        Task<StaffDto> CreateAsync(CreateStaffRequest request);
        Task<StaffDto> UpdateRolesAsync(int staffId, IReadOnlyCollection<string> roles);
        Task<StaffDto> SetActiveAsync(int staffId, bool isActive);
    }
}
