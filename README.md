# Mahrousa Hotel Management System

A full-stack hotel management system: a **Next.js** front office (reception dashboard,
reservations, check-in, room status, folios, billing, inventory, hall bookings, staff
management) backed by an **ASP.NET Core** Web API with **PostgreSQL**.

The UI is fully bilingual — **English and Arabic** — with right-to-left (RTL) layout
support and a per-user language toggle.

## Repository layout

```
.
├── frontend/   Next.js 16 + React 19 + TypeScript + Tailwind CSS
└── backend/    ASP.NET Core Web API (.NET) + EF Core + PostgreSQL
```

## Frontend (`frontend/`)

Next.js app router project styling the staff-facing dashboard.

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000 (runs with the webpack bundler)
```

Configuration lives in `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5199
```

Key features:
- Reservations, walk-in / phone check-in, room status transitions
- Guest folios with charge posting, payment-proof upload, print/PDF export
- Inventory usage & restock tracking with activity history
- Hall bookings and staff/role administration
- Internationalization (English / Arabic) with full RTL support

## Backend (`backend/`)

Clean-architecture solution (`API`, `Application`, `Domain`, `Infrastructure`).

```bash
cd backend
dotnet restore
dotnet ef database update --project Hotelmanagment.Infrastructure --startup-project Hotelmanagment.API
dotnet run --project Hotelmanagment.API   # http://localhost:5199
```

Configure the database connection and JWT settings in
`backend/Hotelmanagment.API/appsettings.json`.

## Tech stack

| Layer    | Technologies                                              |
| -------- | --------------------------------------------------------- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS            |
| Backend  | ASP.NET Core, Entity Framework Core, PostgreSQL, JWT auth |
