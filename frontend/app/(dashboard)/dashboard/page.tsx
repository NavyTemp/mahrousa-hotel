"use client";

import { useEffect, useMemo, useState } from "react";
import { roomsApi, reservationsApi, dashboardApi } from "@/lib/api";
import type { Room, Reservation, DashboardSnapshot } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/context/LanguageContext";
import { egp } from "@/lib/money";
import {
  Building2, DoorOpen, CheckCircle, Wrench, Phone,
  CalendarCheck, LogIn, LogOut, BedDouble, Wallet,
  Receipt, Package, ClipboardList, PartyPopper,
} from "lucide-react";

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
  });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// YYYY-MM-DD for today (local). We send the same string to the backend,
// which interprets it as a UTC calendar day.
function todayIso() {
  const d = new Date();
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatLongDate(iso: string) {
  // `new Date("YYYY-MM-DD")` is parsed as UTC midnight; render in UTC to
  // avoid showing the previous day in non-UTC timezones.
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "UTC",
  });
}

export default function DashboardPage() {
  const toast = useToast();
  const { t } = useI18n();

  const today = useMemo(() => todayIso(), []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const isToday = selectedDate === today;

  // ── Live "today" view state ──────────────────────────────────────────
  const [rooms,        setRooms]        = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [liveLoading,  setLiveLoading]  = useState(true);

  // ── Snapshot (any chosen date) state ─────────────────────────────────
  // We derive "loading" from whether the snapshot in hand matches the
  // currently-selected date, instead of tracking a separate boolean — this
  // avoids the cascading-render anti-pattern of toggling loading inside
  // the effect.
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const snapshotLoading = !snapshot || snapshot.date !== selectedDate;

  // Live data — only fetched once, for the "today" view.
  useEffect(() => {
    Promise.all([roomsApi.getAll(), reservationsApi.getActive()])
      .then(([r, res]) => {
        setRooms(r);
        setReservations(res);
      })
      .catch(() => toast.error(t("Failed to load dashboard data.")))
      .finally(() => setLiveLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Snapshot — re-fetch whenever the selected date changes.
  useEffect(() => {
    let cancelled = false;
    dashboardApi.getSnapshot(selectedDate)
      .then(s => { if (!cancelled) setSnapshot(s); })
      .catch(() => { if (!cancelled) toast.error(t("Failed to load snapshot for that date.")); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const available   = rooms.filter(r => r.status === "Available").length;
  const occupied    = rooms.filter(r => r.status === "Occupied").length;
  const dirty       = rooms.filter(r => r.status === "Dirty").length;
  const maintenance = rooms.filter(r => r.status === "Maintenance").length;
  const occupancy   = rooms.length
    ? Math.round((occupied / rooms.length) * 100)
    : 0;

  const checkedIn = reservations.filter(r => r.status === "CheckedIn");
  const pending   = reservations.filter(r => r.status === "Pending");

  const datePicker = (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px",
    }}>
      <label
        htmlFor="snapshot-date"
        style={{
          fontSize: "10px",
          fontWeight: 600,
          color: "#1f6675",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {t("View date")}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          id="snapshot-date"
          type="date"
          value={selectedDate}
          max={today}
          onChange={(e) => setSelectedDate(e.target.value || today)}
          style={{
            padding: "8px 10px",
            fontSize: "12px",
            background: "#fff",
            color: "#0e2638",
            border: "0.5px solid rgba(0,0,0,0.15)",
            borderRadius: "8px",
            outline: "none",
          }}
        />
        {!isToday && (
          <button
            type="button"
            onClick={() => setSelectedDate(today)}
            style={{
              padding: "8px 10px",
              fontSize: "11px",
              fontWeight: 600,
              background: "#e7f0f2",
              color: "#155160",
              border: "0.5px solid rgba(21,81,96,0.2)",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {t("Today")}
          </button>
        )}
      </div>
    </div>
  );

  if (isToday && liveLoading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={isToday ? t(greeting()) : t("Daily snapshot")}
        subtitle={
          isToday
            ? new Date().toLocaleDateString("en-GB", {
                weekday: "long", day: "numeric",
                month: "long", year: "numeric",
              })
            : formatLongDate(selectedDate)
        }
        action={datePicker}
      />

      {isToday ? (
        <LiveTodayView
          rooms={rooms}
          available={available}
          occupied={occupied}
          dirty={dirty}
          maintenance={maintenance}
          occupancy={occupancy}
          checkedIn={checkedIn}
          pending={pending}
        />
      ) : (
        <SnapshotView
          loading={snapshotLoading}
          snapshot={snapshot}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Live "today" view (the original dashboard)
// ────────────────────────────────────────────────────────────────────────

function LiveTodayView({
  rooms, available, occupied, dirty, maintenance, occupancy,
  checkedIn, pending,
}: {
  rooms: Room[];
  available: number;
  occupied: number;
  dirty: number;
  maintenance: number;
  occupancy: number;
  checkedIn: Reservation[];
  pending: Reservation[];
}) {
  const { t } = useI18n();
  return (
    <>
      {/* Stat cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-head">
            <p className="stat-label">{t("Total rooms")}</p>
            <div className="stat-icon gold"><Building2 size={14} /></div>
          </div>
          <p className="stat-val">{rooms.length}</p>
          <p className="stat-sub">{t("{n}% occupancy", { n: occupancy })}</p>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <p className="stat-label">{t("Available")}</p>
            <div className="stat-icon green"><CheckCircle size={14} /></div>
          </div>
          <p className="stat-val">{available}</p>
          <p className="stat-sub">{t("Ready to book")}</p>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <p className="stat-label">{t("Occupied")}</p>
            <div className="stat-icon blue"><DoorOpen size={14} /></div>
          </div>
          <p className="stat-val">{occupied}</p>
          <p className="stat-sub">{t("{n} checked in", { n: checkedIn.length })}</p>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <p className="stat-label">{t("Needs service")}</p>
            <div className="stat-icon red"><Wrench size={14} /></div>
          </div>
          <p className="stat-val">{dirty + maintenance}</p>
          <p className="stat-sub">{t("{dirty} dirty · {maint} maint.", { dirty, maint: maintenance })}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>

        {/* Active reservations table */}
        <div>
          <p style={{
            fontSize: "10px", fontWeight: 600, color: "#6f7c89",
            textTransform: "uppercase", letterSpacing: "0.06em",
            marginBottom: "10px",
          }}>
            {t("Checked in — {n}", { n: checkedIn.length })}
          </p>
          <div className="table-wrap">
            {checkedIn.length === 0 ? (
              <div style={{ padding: "48px 0", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "#6f7c89" }}>{t("No guests checked in")}</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    {["Guest", "Room", "Check-out", "Source"].map(h => (
                      <th key={h}>{t(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {checkedIn.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div className="av" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{
                            width: "28px", height: "28px", borderRadius: "50%",
                            background: "#dfe9ec", color: "#155160",
                            fontSize: "10px", fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            {initials(r.guestName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: "12px" }}>
                              {r.guestName}
                            </div>
                            <div style={{ fontSize: "10px", color: "#6f7c89" }}>
                              {r.guestPhone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {r.roomNumber ?? "—"}
                      </td>
                      <td style={{ color: "#465766" }}>
                        {formatDate(r.checkOutDate)}
                      </td>
                      <td>
                        <Badge
                          label={r.source === "WalkIn" ? t("Walk-in") : t("Phone")}
                          variant={r.source === "WalkIn" ? "walkin" : "phone"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Pending bookings */}
          <div>
            <p style={{
              fontSize: "10px", fontWeight: 600, color: "#6f7c89",
              textTransform: "uppercase", letterSpacing: "0.06em",
              marginBottom: "10px",
            }}>
              {t("Pending — {n}", { n: pending.length })}
            </p>
            <div className="table-wrap">
              {pending.length === 0 ? (
                <div style={{ padding: "36px 0", textAlign: "center" }}>
                  <p style={{ fontSize: "12px", color: "#6f7c89" }}>{t("No pending bookings")}</p>
                </div>
              ) : (
                <div>
                  {pending.map(r => (
                    <div key={r.id} style={{
                      padding: "10px 16px",
                      display: "flex", alignItems: "center", gap: "10px",
                      borderBottom: "0.5px solid rgba(0,0,0,0.05)",
                    }}>
                      <div style={{
                        width: "26px", height: "26px", borderRadius: "7px",
                        background: "#dfe9ec",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "12px", color: "#155160",
                        flexShrink: 0,
                      }}>
                        <Phone size={12} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", fontWeight: 500, color: "#0e2638" }}>
                          {r.guestName}
                        </div>
                        <div style={{ fontSize: "10px", color: "#6f7c89" }}>
                          {t("Check-in {date}", { date: formatDate(r.checkInDate) })}
                        </div>
                      </div>
                      <Badge label={t("Pending")} variant="pending" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Room overview mini */}
          <div>
            <p style={{
              fontSize: "10px", fontWeight: 600, color: "#6f7c89",
              textTransform: "uppercase", letterSpacing: "0.06em",
              marginBottom: "10px",
            }}>
              {t("Room overview")}
            </p>
            <div style={{
              background: "#fff",
              border: "0.5px solid rgba(0,0,0,0.1)",
              borderRadius: "12px",
              padding: "14px 16px",
            }}>
              {[
                { label: "Available",   count: available,   color: "#57a23f" },
                { label: "Occupied",    count: occupied,    color: "#2f78c7" },
                { label: "Dirty",       count: dirty,       color: "#c47a3b" },
                { label: "Maintenance", count: maintenance, color: "#c9423f" },
              ].map((item, i) => (
                <div key={item.label} style={{
                  marginBottom: i < 3 ? "10px" : 0,
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: "11px", marginBottom: "4px",
                  }}>
                    <span style={{ color: "#465766" }}>{t(item.label)}</span>
                    <span style={{ fontWeight: 600 }}>{item.count}</span>
                  </div>
                  <div style={{
                    height: "6px", background: "#ece4cf",
                    borderRadius: "99px", overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: "99px",
                      background: item.color,
                      width: rooms.length ? `${(item.count / rooms.length) * 100}%` : "0%",
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Historic snapshot view
// ────────────────────────────────────────────────────────────────────────

function SnapshotView({
  loading, snapshot,
}: {
  loading: boolean;
  snapshot: DashboardSnapshot | null;
}) {
  const { t } = useI18n();
  if (loading || !snapshot) {
    return (
      <div style={{ padding: "48px 0", display: "flex", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  return (
    <>
      {/* Top stat cards: bookings / check-ins / check-outs / in-house */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-head">
            <p className="stat-label">{t("Bookings created")}</p>
            <div className="stat-icon gold"><CalendarCheck size={14} /></div>
          </div>
          <p className="stat-val">{snapshot.bookingsCreated}</p>
          <p className="stat-sub">
            {t("{phone} phone · {walkin} walk-in", { phone: snapshot.phoneBookingsCreated, walkin: snapshot.walkInBookingsCreated })}
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <p className="stat-label">{t("Check-ins")}</p>
            <div className="stat-icon green"><LogIn size={14} /></div>
          </div>
          <p className="stat-val">{snapshot.checkIns}</p>
          <p className="stat-sub">{t("Guests arrived")}</p>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <p className="stat-label">{t("Check-outs")}</p>
            <div className="stat-icon blue"><LogOut size={14} /></div>
          </div>
          <p className="stat-val">{snapshot.checkOuts}</p>
          <p className="stat-sub">{t("Guests departed")}</p>
        </div>

        <div className="stat-card">
          <div className="stat-head">
            <p className="stat-label">{t("In house (end of day)")}</p>
            <div className="stat-icon red"><BedDouble size={14} /></div>
          </div>
          <p className="stat-val">{snapshot.guestsInHouse}</p>
          <p className="stat-sub">{t("{n} pending", { n: snapshot.pendingReservations })}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Money */}
        <div>
          <p style={{
            fontSize: "10px", fontWeight: 600, color: "#6f7c89",
            textTransform: "uppercase", letterSpacing: "0.06em",
            marginBottom: "10px",
          }}>
            {t("Money")}
          </p>
          <div style={{
            background: "#fff",
            border: "0.5px solid rgba(0,0,0,0.1)",
            borderRadius: "12px",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}>
            <SnapshotMoneyRow
              icon={<Wallet size={14} />}
              label={t("Revenue collected")}
              hint={t("{n} payment(s) confirmed", { n: snapshot.paymentsConfirmed })}
              value={egp(snapshot.revenueCollected)}
              accent="#2f5d0f"
            />
            <SnapshotMoneyRow
              icon={<Receipt size={14} />}
              label={t("Charges added")}
              hint={t("All folio line items posted on this day")}
              value={egp(snapshot.chargesAdded)}
              accent="#155160"
            />

            <div style={{
              borderTop: "0.5px solid rgba(0,0,0,0.06)",
              paddingTop: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}>
              <SnapshotBreakdownRow label={t("Room")}       value={egp(snapshot.roomChargesAdded)} />
              <SnapshotBreakdownRow label={t("Restaurant")} value={egp(snapshot.restaurantChargesAdded)} />
              <SnapshotBreakdownRow label={t("Other")}      value={egp(snapshot.otherChargesAdded)} />
            </div>

            <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)", paddingTop: "12px" }}>
              <SnapshotMoneyRow
                icon={<PartyPopper size={14} />}
                label={t("Hall bookings")}
                hint={t("{n} created this day", { n: snapshot.hallBookingsCreated })}
                value={egp(snapshot.hallBookingsRevenue)}
                accent="#8a6d1f"
              />
            </div>
          </div>
        </div>

        {/* Housekeeping */}
        <div>
          <p style={{
            fontSize: "10px", fontWeight: 600, color: "#6f7c89",
            textTransform: "uppercase", letterSpacing: "0.06em",
            marginBottom: "10px",
          }}>
            {t("Housekeeping")}
          </p>
          <div style={{
            background: "#fff",
            border: "0.5px solid rgba(0,0,0,0.1)",
            borderRadius: "12px",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}>
            <SnapshotMoneyRow
              icon={<ClipboardList size={14} />}
              label={t("Inventory usage")}
              hint={t("Items taken to rooms")}
              value={String(snapshot.inventoryUsageEntries)}
              accent="#8e2424"
            />
            <SnapshotMoneyRow
              icon={<Package size={14} />}
              label={t("Inventory restocks")}
              hint={t("Stock added by staff")}
              value={String(snapshot.inventoryRestockEntries)}
              accent="#2f5d0f"
            />

            {snapshot.bookingsCreated === 0 &&
             snapshot.checkIns === 0 &&
             snapshot.checkOuts === 0 &&
             snapshot.paymentsConfirmed === 0 &&
             snapshot.inventoryUsageEntries === 0 &&
             snapshot.inventoryRestockEntries === 0 &&
             snapshot.hallBookingsCreated === 0 && (
              <div style={{
                marginTop: "4px",
                padding: "10px 12px",
                fontSize: "11px",
                color: "#6f7c89",
                background: "#faf9f7",
                borderRadius: "8px",
                textAlign: "center",
              }}>
                {t("Nothing happened on this date.")}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SnapshotMoneyRow({
  icon, label, hint, value, accent,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  value: string;
  accent: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "8px",
        background: "#dfe9ec", color: "#155160",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#0e2638" }}>{label}</div>
        <div style={{ fontSize: "11px", color: "#6f7c89" }}>{hint}</div>
      </div>
      <div style={{ fontSize: "14px", fontWeight: 700, color: accent }}>
        {value}
      </div>
    </div>
  );
}

function SnapshotBreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      fontSize: "11px",
    }}>
      <span style={{ color: "#465766" }}>{label}</span>
      <span style={{ fontWeight: 600, color: "#1f324a" }}>{value}</span>
    </div>
  );
}
