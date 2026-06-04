using System;
using System.Collections.Generic;
using System.Text;

namespace Hotelmanagment.Application.DTOs.Folio
{
    public record AddRestaurantChargeRequest(
        string RoomNumber,
        string Description,
        decimal Amount
    );
}
