# Hotel Management API — Project Summary & "How To Change Things" Guide

This document is written for someone who is **new to this project** (or new to C#)
and needs to make changes safely. Read the first three sections, then jump to the
recipe that matches what you want to do.

---

## 1. What is this project, in one paragraph?

This is the **backend** (the "engine") of a hotel management system. It is a web
**API**: it has no buttons or screens of its own. Instead, a separate website/app
(the "frontend", which lives in a different project) calls this API over the
internet to do things like "check a guest in", "show me today's bookings", or now
**"book a hall for an event"**. The API talks to a **PostgreSQL database** where all
the data is stored.

> **Frontend vs Backend (plain English):**
> - **Frontend** = what the user sees and clicks (runs in the browser).
> - **Backend** = this project. It receives requests, applies the rules, and reads/writes the database.
>
> When this guide says "the frontend should call `POST /api/hallbookings`", it means
> the website developer wires a button to send a request to that address. This repo
> only contains the backend; the frontend already knows how to log in and call these
> addresses.

---

## 2. The tech stack (what each piece is)

| Thing | What it is / why it's here |
|---|---|
| **C# / .NET 10** | The programming language and runtime. |
| **ASP.NET Core** | The web framework that turns C# methods into web addresses (URLs). |
| **Entity Framework Core (EF Core)** | Lets us talk to the database using C# objects instead of writing raw SQL. |
| **PostgreSQL** | The actual database (where rows of data live). |
| **JWT auth** | "Login tokens." After a staff member logs in, every request carries a token proving who they are and what role they have. |
| **Swagger** | An auto-generated test page for the API. Open it in a browser to try endpoints. |

---

## 3. How the code is organized (4 projects)

The solution (`Hotelmanagment.slnx`) is split into 4 projects. Think of them as layers
stacked on top of each other. **Each one is only allowed to depend on the ones below it.**

```
Hotelmanagment.API             ← the "front door": URLs/endpoints (Controllers)
        │  depends on
        ▼
Hotelmanagment.Application      ← the brains: business rules (Services) + data shapes (DTOs)
        │  depends on
        ▼
Hotelmanagment.Infrastructure  ← the database wiring (DbContext, Migrations, Seed data)
        │  depends on
        ▼
Hotelmanagment.Domain          ← the nouns: plain data classes (Entities) + lists of choices (Enums)
```

What lives where:

- **`Hotelmanagment.Domain`** — the "things" in the system as plain C# classes.
  - `Entities/` → one class per database table (e.g. `Room`, `Guest`, `Hall`, `HallBooking`).
  - `Enums/` → fixed lists of options (e.g. `RoomStatus = Available/Occupied/...`).
- **`Hotelmanagment.Application`** — the logic and the rules.
  - `DTOs/` → "Data Transfer Objects": the exact shape of data sent in/out of the API
    (so we never expose raw database classes directly).
  - `Interfaces/` → the contract/promise of what each service can do.
  - `Services/` → the real code that enforces rules and reads/writes data.
- **`Hotelmanagment.Infrastructure`** — the database glue.
  - `Persistence/HotelDbContext.cs` → the master list of tables + how columns are configured.
  - `Persistence/SeedData.cs` → starter data inserted automatically the first time.
  - `Migrations/` → the version history of the database structure (see §8).
- **`Hotelmanagment.API`** — the web entry point.
  - `Controllers/` → maps URLs to service methods.
  - `Program.cs` → startup: connects everything together (the "wiring").

---

## 4. The Golden Rule: one feature = the same ~7 files every time

Every feature in this app follows the **exact same pattern** ("vertical slice").
The Hall Booking feature we just added is a perfect example. If you copy this list,
you can build almost anything:

| # | File you create/edit | Project | Purpose | Hall example |
|---|---|---|---|---|
| 1 | `Entities/Xyz.cs` | Domain | The table/data class | `Hall.cs`, `HallBooking.cs` |
| 2 | `Enums/XyzStatus.cs` | Domain | Fixed option lists (if needed) | `HallStatus.cs`, `HallBookingStatus.cs` |
| 3 | `DTOs/.../XyzDto.cs` + request | Application | Shapes for in/out data | `HallDto`, `CreateHallBookingRequest` |
| 4 | `Interfaces/IXyzService.cs` | Application | The list of actions | `IHallService`, `IHallBookingService` |
| 5 | `Services/XyzService.cs` | Application | The rules + database code | `HallService`, `HallBookingService` |
| 6 | edit `HotelDbContext.cs` | Infrastructure | Register the new table(s) | added `DbSet<Hall>`, `DbSet<HallBooking>` |
| 7 | `Controllers/XyzController.cs` + edit `Program.cs` | API | The URLs + register the service | `HallsController`, `HallBookingsController` |

Then you create a **migration** (§8) so the database actually gets the new tables.

---

## 5. How one request flows through the system

Example: the front desk books a hall.

```
Frontend  ──POST /api/hallbookings──►  HallBookingsController   (API layer: receives the call)
                                              │ calls
                                              ▼
                                       HallBookingService        (Application layer: checks the rules)
                                              │ e.g. "is the hall free?", "does it fit the guests?"
                                              ▼
                                       HotelDbContext            (Infrastructure: saves to PostgreSQL)
                                              │ returns
                                              ▼
                                       HallBookingDto  ──────►   back to the frontend as JSON
```

If a rule is broken, the service `throw`s an error and a single piece of middleware
(`ExceptionHandlingMiddleware.cs`) turns it into a clean response:
- `KeyNotFoundException` → **404 Not Found**
- `InvalidOperationException` → **400 Bad Request** (used for "business rule broken")
- `UnauthorizedAccessException` → **401 Unauthorized**

So in services you just `throw new InvalidOperationException("Hall is already booked");`
and the user gets a tidy `{ "message": "Hall is already booked" }`.

---

## 6. Staff roles & test logins

Roles are defined in `Domain/Enums/StaffRole.cs`: **Admin, Reception, Cashier,
RoomService, Restaurant**. "Front desk" = the **Reception** role.

Seeded accounts (created automatically on first run — see `SeedData.cs`):

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin (can do everything) |
| `reception1` | `reception123` | Reception (front desk) |
| `cashier1` | `cashier123` | Cashier |
| `roomsvc1` | `roomsvc123` | RoomService |
| `restaurant1` | `rest123` | Restaurant |

Access is restricted per endpoint with attributes like `[Authorize(Roles = "Reception,Admin")]`.

---

## 7. The Hall Booking feature (what was just added)

**Goal:** let the **front desk (Reception/Admin)** book event halls (ballrooms,
conference rooms, etc.) for customers, while preventing two bookings from overlapping
in the same hall.

### New data
- **`Hall`** — an event space: `Name`, `Capacity` (max people), `HourlyRate` (price per
  hour), `Status` (`Available` or `Maintenance`).
- **`HallBooking`** — one reservation of a hall: customer name & phone, optional
  `Purpose` (e.g. "Wedding"), `AttendeeCount`, `StartTime`/`EndTime`, `TotalPrice`
  (calculated automatically), and `Status` (`Pending` → `Confirmed` → `Completed`, or `Cancelled`).

> **Why store customer name/phone directly on the booking** (instead of using the
> `Guest` table)? Hall events are usually booked by outside customers who are **not**
> staying at the hotel, so we keep them separate from hotel guests.

### Rules enforced by `HallBookingService`
- End time must be after start time, and must not be entirely in the past.
- Attendee count must be ≥ 1 and **must fit the hall's capacity**.
- A hall in **Maintenance** cannot be booked.
- **No double-booking:** if any non-cancelled booking on that hall overlaps the
  requested time window, the request is rejected.
- **Price** = `HourlyRate × number of hours` (rounded up to the next full hour, minimum 1 hour).

### Endpoints (what the frontend calls)
All require a logged-in user. Booking actions require **Reception or Admin**.

| Method & URL | What it does |
|---|---|
| `GET /api/halls` | List all halls. |
| `GET /api/halls/available?start=...&end=...` | List halls free in a time window. |
| `PATCH /api/halls/{id}/status` | Put a hall into/out of Maintenance (RoomService/Admin). Body: `{ "status": "Maintenance" }`. |
| `GET /api/hallbookings` | List upcoming/active bookings (Pending + Confirmed). |
| `POST /api/hallbookings` | **Create a booking.** Body = `CreateHallBookingRequest`. |
| `POST /api/hallbookings/{id}/confirm` | Mark a Pending booking as Confirmed. |
| `POST /api/hallbookings/{id}/cancel` | Cancel a booking. |
| `POST /api/hallbookings/{id}/complete` | Mark a booking as Completed (event done). |

Example body for `POST /api/hallbookings`:

```json
{
  "hallId": 1,
  "customerName": "Jane Doe",
  "customerPhone": "+1 555 0100",
  "attendeeCount": 150,
  "startTime": "2026-07-01T18:00:00Z",
  "endTime":   "2026-07-01T23:00:00Z",
  "purpose": "Wedding reception"
}
```

> **Tip:** send times in UTC with a `Z` on the end (like above). The server normalises
> times to UTC because the database stores "timestamp with time zone".

The **admin dashboard** (`GET /api/dashboard/snapshot`) now also reports
`HallBookingsCreated` and `HallBookingsRevenue` for the day.

---

## 8. Running and changing the database

### Run the API locally
1. Install **.NET 10 SDK** and **PostgreSQL**.
2. Make sure the connection string in `Hotelmanagment.API/appsettings.json` matches your
   PostgreSQL (host, port, database name, username, password).
3. From the repo folder:
   ```bash
   dotnet run --project Hotelmanagment.API
   ```
4. On startup the app **automatically** (a) applies any pending database migrations and
   (b) inserts seed data. Then open the Swagger test page in your browser at the running
   address (e.g. `http://localhost:5199/swagger`).

> If you see a "file is locked" / "being used by another process" build error, an old
> copy of the API is still running. Stop it first, then build/run again.

### Changing the database structure (migrations)
The database structure is versioned by files in `Infrastructure/Migrations/`. **Whenever
you add/remove/rename a property on an entity (or add a new entity), you must add a
migration**, otherwise the real database won't have the new column/table.

Normally you would run:
```bash
dotnet ef migrations add MyChangeName --project Hotelmanagment.Infrastructure --startup-project Hotelmanagment.API
```

> **Known gotcha in this repo:** the installed `dotnet ef` tool version did not match the
> project's EF Core packages, which made `dotnet ef` crash with
> `Method not found: ...AbstractionsStrings.ArgumentIsEmpty`. The Hall Booking migration
> (`20260604120000_AddHallAndHallBooking`) was therefore **hand-written** to match the
> existing migration style. If you hit the same crash, the reliable fix is to make the
> EF tool version equal the EF Core runtime version the project restores (currently the
> EF Core runtime resolves to **10.0.4**), e.g. install a matching local tool:
> ```bash
> dotnet new tool-manifest
> dotnet tool install dotnet-ef --version 10.0.4
> dotnet dotnet-ef migrations add MyChangeName --project Hotelmanagment.Infrastructure --startup-project Hotelmanagment.API
> ```
> You do **not** normally need to run "database update" yourself — the app applies
> migrations on startup.

A migration is really 3 files (look at `20260604120000_AddHallAndHallBooking*` as a template):
1. `<timestamp>_Name.cs` — `Up()` creates the tables, `Down()` removes them.
2. `<timestamp>_Name.Designer.cs` — carries the required `[Migration("...")]` marker.
3. `HotelDbContextModelSnapshot.cs` — the "current full picture" of the database (edited, not replaced).

---

## 9. Recipe: add a brand-new feature (copy the Hall pattern)

Say you want to add "Parking Spot booking". Do exactly what halls did:

1. **Domain:** add `Entities/ParkingSpot.cs` and `Entities/ParkingBooking.cs`
   (+ any `Enums/...Status.cs`). Copy `Hall.cs` / `HallBooking.cs` and rename.
2. **Infrastructure:** in `HotelDbContext.cs` add `public DbSet<ParkingSpot> ParkingSpots => Set<ParkingSpot>();`
   (and the booking), and add a configuration block in `OnModelCreating` (copy the Hall block —
   it sets max lengths, the price column type, and the foreign key).
3. **Application:** add `DTOs/Parking/...` (copy the Hall DTOs), `Interfaces/IParkingService.cs`,
   and `Services/ParkingService.cs` (copy `HallService`/`HallBookingService` and adjust the rules).
4. **API:** add `Controllers/ParkingController.cs` (copy `HallBookingsController`) and, in
   `Program.cs`, register it: `builder.Services.AddScoped<IParkingService, ParkingService>();`
5. **Migration:** add a migration (see §8) so the new tables get created.
6. **Seed (optional):** add a `SeedParking(db)` method in `SeedData.cs` and call it from `Seed()`.
7. Build and run.

---

## 10. Common small changes — cheat sheet

- **Change a seeded hall's price/capacity:** edit `SeedData.cs → SeedHalls`. Note: seeding
  only runs when the `Halls` table is empty. To change an existing row, edit it in the
  database, or add logic like the inventory seeder which back-fills existing rows.
- **Add a new field to a hall (e.g. a description):**
  1. add the property to `Domain/Entities/Hall.cs`,
  2. (optional) configure it in `HotelDbContext.cs`,
  3. add it to `HallDto` and the create request if the frontend needs it,
  4. **add a migration** (§8).
- **Let a different role book halls:** edit the `[Authorize(Roles = "...")]` line on
  `HallBookingsController`.
- **Change the price rule (e.g. per-day instead of per-hour):** edit `CalculatePrice` in
  `HallBookingService.cs`.
- **Add a new status step:** add the value to `HallBookingStatus.cs` and handle it in the
  relevant service methods.

---

## 11. Things NOT to break (important)

- **Always add a migration** after changing any `Entity`. Code that compiles but lacks a
  matching migration will crash at runtime ("column does not exist").
- **Keep the layer direction** (API → Application → Infrastructure → Domain). For example,
  never reference a Controller from a Service. Domain should reference nothing.
- **Send/keep dates in UTC.** The DB columns are "timestamp with time zone"; non-UTC dates
  can throw.
- **Don't expose entities directly** from controllers — return DTOs (that's why they exist).
- **Don't commit real secrets.** `appsettings.json` currently holds a dev connection string
  and JWT key; use environment variables/secret storage for production.
```
