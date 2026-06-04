using System;
using System.Threading.Tasks;
using Hotelmanagment.Application.DTOs.Dashboard;

namespace Hotelmanagment.Application.Interfaces
{
    public interface IDashboardService
    {
        /// <summary>
        /// Builds an aggregated snapshot of activity on the given calendar date
        /// (interpreted as UTC).
        /// </summary>
        Task<DashboardSnapshotDto> GetSnapshotAsync(DateOnly date);
    }
}
