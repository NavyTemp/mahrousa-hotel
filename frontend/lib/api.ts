import type {
    Room, RoomFeature, RoomFeatureType, Reservation, Folio,
    InventoryItem, InventoryRestockLog, InventoryUsageLog,
    Staff, StaffRole, DashboardSnapshot,
    Hall, HallBooking,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5199";

function getToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("hotel_auth");
        return raw ? JSON.parse(raw).token : null;
    } catch {
        return null;
    }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = getToken();

    // Let the browser set the multipart boundary when sending FormData —
    // explicitly setting Content-Type would break the request.
    const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
    const baseHeaders: Record<string, string> = isForm
        ? {}
        : { "Content-Type": "application/json" };

    const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
            ...baseHeaders,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...init.headers,
        },
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Request failed (${res.status})`);
    }

    if (res.status === 204) return undefined as T;
    // Tolerate empty 200 responses (e.g. when the server just returns a status text).
    const text = await res.text();
    if (!text) return undefined as T;
    try {
        return JSON.parse(text) as T;
    } catch {
        return undefined as T;
    }
}

export const authApi = {
    login: (username: string, password: string) =>
        request<{ token: string; fullName: string; roles: StaffRole[]; staffId: number }>(
            "/api/auth/login",
            { method: "POST", body: JSON.stringify({ username, password }) }
        ),
};

export const roomsApi = {
    getAll: () => request<Room[]>("/api/rooms"),
    updateStatus: (id: number, status: string) =>
        request<void>(`/api/rooms/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
        }),
};

// Per-room contents (beds, TV, fridge, AC, etc.). Backend enforces unique
// (RoomId, Type) — `upsert` will update an existing row instead of creating a
// duplicate.
export const roomFeaturesApi = {
    getByRoom: (roomId: number) =>
        request<RoomFeature[]>(`/api/rooms/${roomId}/features`),
    upsert: (roomId: number, data: {
        type: RoomFeatureType;
        quantity: number;
        notes?: string | null;
    }) =>
        request<RoomFeature>(`/api/rooms/${roomId}/features`, {
            method: "POST",
            body: JSON.stringify(data),
        }),
    remove: (roomId: number, featureId: number) =>
        request<void>(`/api/rooms/${roomId}/features/${featureId}`, {
            method: "DELETE",
        }),
};

export const reservationsApi = {
    getActive: () => request<Reservation[]>("/api/reservations"),
    phoneBooking: (data: {
        guestFullName: string;
        guestPhone: string;
        checkInDate: string;
        checkOutDate: string;
    }) =>
        request<Reservation>("/api/reservations/phone", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    checkIn: (data: {
        guestFullName: string;
        guestPhone: string;
        nationalId?: string;
        roomId: number;
        checkOutDate: string;
        existingReservationId?: number | null;
        checkInDate?: string;
    }) =>
        request<Reservation>("/api/reservations/checkin", {
            method: "POST",
            body: JSON.stringify(data),
        }),
};

export const hallsApi = {
    getAll: () => request<Hall[]>("/api/halls"),
    /** Halls with no active booking overlapping [start, end). ISO strings. */
    getAvailable: (start: string, end: string) =>
        request<Hall[]>(
            `/api/halls/available?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
        ),
    updateStatus: (id: number, status: string) =>
        request<void>(`/api/halls/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
        }),
};

export const hallBookingsApi = {
    getActive: () => request<HallBooking[]>("/api/hallbookings"),
    create: (data: {
        hallId: number;
        customerName: string;
        customerPhone: string;
        attendeeCount: number;
        startTime: string;
        endTime: string;
        purpose?: string | null;
    }) =>
        request<HallBooking>("/api/hallbookings", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    confirm: (id: number) =>
        request<HallBooking>(`/api/hallbookings/${id}/confirm`, { method: "POST" }),
    cancel: (id: number) =>
        request<HallBooking>(`/api/hallbookings/${id}/cancel`, { method: "POST" }),
    complete: (id: number) =>
        request<HallBooking>(`/api/hallbookings/${id}/complete`, { method: "POST" }),
};

export const folioApi = {
    getByGuest: (guestId: number) =>
        request<Folio>(`/api/folio/guest/${guestId}`),
    getByReservation: (reservationId: number) =>
        request<Folio>(`/api/folio/reservation/${reservationId}`),
    getByRoom: (roomNumber: string) =>
        request<Folio>(`/api/folio/room/${roomNumber}`),
    confirmPayment: (folioId: number, proof: File) => {
        const fd = new FormData();
        fd.append("proof", proof, proof.name);
        return request<{ message: string; proofPath: string }>(
            `/api/folio/${folioId}/confirm-payment`,
            { method: "POST", body: fd },
        );
    },
};

export const restaurantApi = {
    addCharge: (data: {
        roomNumber: string;
        description: string;
        amount: number;
    }) =>
        request<void>("/api/restaurant/charge", {
            method: "POST",
            body: JSON.stringify(data),
        }),
};

export const inventoryApi = {
    getAll: () => request<InventoryItem[]>("/api/inventory"),
    use: (data: { roomId: number; itemId: number; quantity: number }) =>
        request<void>("/api/inventory/use", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    restock: (data: { itemId: number; quantity: number }) =>
        request<InventoryItem>("/api/inventory/restock", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    getRestockLogs: (take = 50) =>
        request<InventoryRestockLog[]>(`/api/inventory/restock-logs?take=${take}`),
    getUsageLogs: (take = 50) =>
        request<InventoryUsageLog[]>(`/api/inventory/usage-logs?take=${take}`),
};

export const staffApi = {
    getAll: () => request<Staff[]>("/api/staff"),
    create: (data: {
        fullName: string;
        username: string;
        password: string;
        roles: StaffRole[];
    }) =>
        request<Staff>("/api/staff", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    updateRoles: (id: number, roles: StaffRole[]) =>
        request<Staff>(`/api/staff/${id}/roles`, {
            method: "PATCH",
            body: JSON.stringify({ roles }),
        }),
    setActive: (id: number, isActive: boolean) =>
        request<Staff>(`/api/staff/${id}/active`, {
            method: "PATCH",
            body: JSON.stringify({ isActive }),
        }),
};

export const dashboardApi = {
    /** Aggregated activity for a given calendar date (YYYY-MM-DD, UTC). */
    getSnapshot: (date: string) =>
        request<DashboardSnapshot>(`/api/dashboard/snapshot?date=${date}`),
};