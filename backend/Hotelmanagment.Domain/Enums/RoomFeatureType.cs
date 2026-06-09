namespace Hotelmanagment.Domain.Enums
{
    /// <summary>
    /// What a room can physically contain. Used by <see cref="Entities.RoomFeature"/>
    /// so the front desk / housekeeping can tell at a glance what is in each room
    /// (e.g. how many beds, whether there is a TV, fridge, AC, etc.).
    ///
    /// Treat this as an append-only list: new values are safe to add, but renaming
    /// or removing a value is a breaking change because existing rows store the
    /// name as text in the database.
    /// </summary>
    public enum RoomFeatureType
    {
        // ── Beds ─────────────────────────────────────────────────────────
        SingleBed,
        DoubleBed,
        QueenBed,
        KingBed,
        SofaBed,

        // ── Electronics / appliances ────────────────────────────────────
        Tv,
        AirConditioner,
        MiniFridge,
        Safe,
        Hairdryer,
        Kettle,

        // ── Bathroom ────────────────────────────────────────────────────
        Bathtub,
        Shower,

        // ── Furniture / room features ───────────────────────────────────
        Desk,
        Sofa,
        Wardrobe,
        Balcony,
    }
}
