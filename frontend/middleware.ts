import { NextRequest, NextResponse } from "next/server";

const ROLE_ROUTES: Record<string, string[]> = {
    "/dashboard": ["Admin"],
    "/staff": ["Admin"],
    "/reservations": ["Reception", "Admin"],
    "/checkin": ["Reception", "Admin"],
    "/rooms": ["Reception", "Admin"],
    "/hall-bookings": ["Reception", "Admin"],
    "/folio": ["Cashier", "Admin"],
    "/room-status": ["RoomService", "Admin"],
    "/inventory": ["RoomService", "Admin"],
    "/history": ["RoomService", "Admin"],
    "/charge": ["Restaurant", "Admin"],
};

const ROLE_PRIORITY = ["Admin", "Reception", "Cashier", "RoomService", "Restaurant"];

function defaultPage(roles: string[]): string {
    const top = ROLE_PRIORITY.find(r => roles.includes(r));
    switch (top) {
        case "Admin": return "/dashboard";
        case "Reception": return "/reservations";
        case "Cashier": return "/folio/search";
        case "RoomService": return "/room-status";
        case "Restaurant": return "/charge";
        default: return "/login";
    }
}

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    if (pathname.startsWith("/login")) return NextResponse.next();

    const raw = req.cookies.get("hotel_auth")?.value;
    if (!raw) return NextResponse.redirect(new URL("/login", req.url));

    try {
        const payload = JSON.parse(decodeURIComponent(raw));
        // Back-compat: older sessions stored `role`, newer store `roles[]`.
        const roles: string[] = Array.isArray(payload.roles)
            ? payload.roles
            : payload.role
            ? [payload.role]
            : [];

        const match = Object.entries(ROLE_ROUTES).find(([route]) =>
            pathname.startsWith(route)
        );
        if (match && !match[1].some(r => roles.includes(r))) {
            return NextResponse.redirect(new URL(defaultPage(roles), req.url));
        }
    } catch {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
