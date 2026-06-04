using Hotelmanagment.Application.DTOs.Folio;
using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.Interfaces
{
    public interface IRestaurantService
    {
        Task AddChargeAsync(AddRestaurantChargeRequest request);
    }
}
