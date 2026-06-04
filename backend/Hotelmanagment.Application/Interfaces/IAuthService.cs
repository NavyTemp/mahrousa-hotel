using Hotelmanagment.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.Interfaces
{
    public interface IAuthService
    {
        Task<LoginResponse?> LoginAsync(LoginRequest request);
    }
}
