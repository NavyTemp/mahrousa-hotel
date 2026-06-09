export type StaffRole =
    | "Admin"
    | "Reception"
    | "Cashier"
    | "RoomService"
    | "Restaurant";

export const ALL_STAFF_ROLES: StaffRole[] = [
    "Admin",
    "Reception",
    "Cashier",
    "RoomService",
    "Restaurant",
];

export interface AuthUser {
    staffId: number;
    fullName: string;
    roles: StaffRole[];
    token: string;
}

export type RoomStatus = "Available" | "Occupied" | "Dirty" | "Maintenance";
export type RoomType = "Single" | "Double" | "Suite";

// Mirrors backend Hotelmanagment.Domain.Enums.RoomFeatureType. Append-only —
// removing or renaming a value would break older rows stored as text.
export type RoomFeatureType =
    | "SingleBed" | "DoubleBed" | "QueenBed" | "KingBed" | "SofaBed"
    | "Tv" | "AirConditioner" | "MiniFridge" | "Safe" | "Hairdryer" | "Kettle"
    | "Bathtub" | "Shower"
    | "Desk" | "Sofa" | "Wardrobe" | "Balcony";

export const ALL_ROOM_FEATURE_TYPES: RoomFeatureType[] = [
    "SingleBed", "DoubleBed", "QueenBed", "KingBed", "SofaBed",
    "Tv", "AirConditioner", "MiniFridge", "Safe", "Hairdryer", "Kettle",
    "Bathtub", "Shower",
    "Desk", "Sofa", "Wardrobe", "Balcony",
];

export interface RoomFeature {
    id: number;
    type: RoomFeatureType;
    quantity: number;
    notes: string | null;
}

export interface Room {
    id: number;
    roomNumber: string;
    type: RoomType;
    status: RoomStatus;
    pricePerNight: number;
    features: RoomFeature[];
}

export type ReservationStatus = "Pending" | "CheckedIn" | "CheckedOut" | "Cancelled";
export type ReservationSource = "Phone" | "WalkIn";

export interface Reservation {
    id: number;
    guestName: string;
    guestPhone: string;
    roomNumber: string | null;
    status: ReservationStatus;
    source: ReservationSource;
    checkInDate: string;
    checkOutDate: string;
}

export type HallStatus = "Available" | "Maintenance";

export interface Hall {
    id: number;
    name: string;
    capacity: number;
    hourlyRate: number;
    status: HallStatus;
}

export type HallBookingStatus = "Pending" | "Confirmed" | "Cancelled" | "Completed";

export interface HallBooking {
    id: number;
    hallId: number;
    hallName: string;
    customerName: string;
    customerPhone: string;
    purpose: string | null;
    attendeeCount: number;
    startTime: string;
    endTime: string;
    totalPrice: number;
    status: HallBookingStatus;
    createdAt: string;
}

export type FolioLineType = "RoomCharge" | "RestaurantCharge" | "Other";

export interface FolioLine {
    id: number;
    lineType: FolioLineType;
    description: string;
    amount: number;
    createdAt: string;
}

export interface Folio {
    id: number;
    reservationId: number;
    guestName: string;
    guestPhone: string;
    roomNumber: string;
    roomType: string;
    pricePerNight: number;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    isPaid: boolean;
    total: number;
    createdAt: string;
    paymentProofPath?: string | null;
    lines: FolioLine[];
}

export type InventoryCategory =
    | "SelfCare"
    | "Linens"
    | "Bathroom"
    | "Beverages"
    | "Cleaning";

export interface InventoryItem {
    id: number;
    name: string;
    quantity: number;
    category: InventoryCategory;
}

export interface InventoryRestockLog {
    id: number;
    itemId: number;
    itemName: string;
    staffId: number;
    staffName: string;
    quantityAdded: number;
    addedAt: string;
}

export interface InventoryUsageLog {
    id: number;
    itemId: number;
    itemName: string;
    roomId: number;
    roomNumber: string;
    staffId: number;
    staffName: string;
    quantityUsed: number;
    usedAt: string;
}

export interface Staff {
    id: number;
    fullName: string;
    username: string;
    roles: StaffRole[];
    isActive: boolean;
}

export interface DashboardSnapshot {
    date: string;
    bookingsCreated: number;
    phoneBookingsCreated: number;
    walkInBookingsCreated: number;
    checkIns: number;
    checkOuts: number;
    guestsInHouse: number;
    pendingReservations: number;
    revenueCollected: number;
    paymentsConfirmed: number;
    chargesAdded: number;
    roomChargesAdded: number;
    restaurantChargesAdded: number;
    otherChargesAdded: number;
    inventoryUsageEntries: number;
    inventoryRestockEntries: number;
    hallBookingsCreated: number;
    hallBookingsRevenue: number;
}