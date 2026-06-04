"use client";

import { useEffect, useMemo, useRef, useState, FormEvent } from "react";
import { reservationsApi, roomsApi } from "@/lib/api";
import { egp } from "@/lib/money";
import type { Reservation, Room } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { GoldButton, Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/context/LanguageContext";
import {
  CalendarCheck, Phone, DoorOpen, Check, X,
  Search, BedDouble,
} from "lucide-react";

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function ReservationsPage() {
  const toast = useToast();
  const { t } = useI18n();
  const [data,    setData]    = useState<Reservation[]>([]);
  const [rooms,   setRooms]   = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    guestFullName: "", guestPhone: "",
    checkInDate: "", checkOutDate: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<typeof form>>({});
  const [creating, setCreating] = useState(false);

  // Inline "assign a room" state — one row at a time.
  const [assignTo,      setAssignTo]      = useState<number | null>(null);
  const [assignRoomId,  setAssignRoomId]  = useState("");
  const [assignBusy,    setAssignBusy]    = useState(false);

  const availableRooms = rooms.filter(r => r.status === "Available");

  useEffect(() => {
    Promise.all([reservationsApi.getActive(), roomsApi.getAll()])
      .then(([reservs, rs]) => { setData(reservs); setRooms(rs); })
      .catch(e => setError(e instanceof Error ? e.message : t("Failed to load.")))
      .finally(() => setLoading(false));
  }, []);

  async function handlePhoneBooking(e: FormEvent) {
    e.preventDefault();
    const errs: Partial<typeof form> = {};
    if (!form.guestFullName.trim()) errs.guestFullName = t("Required.");
    if (!form.guestPhone.trim())    errs.guestPhone    = t("Required.");
    if (!form.checkInDate)          errs.checkInDate   = t("Required.");
    if (!form.checkOutDate)         errs.checkOutDate  = t("Required.");
    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    setCreating(true);
    try {
      const res = await reservationsApi.phoneBooking({
        guestFullName: form.guestFullName,
        guestPhone:    form.guestPhone,
        checkInDate:   new Date(form.checkInDate).toISOString(),
        checkOutDate:  new Date(form.checkOutDate).toISOString(),
      });
      setData(prev => [res, ...prev]);
      setForm({ guestFullName: "", guestPhone: "", checkInDate: "", checkOutDate: "" });
      setShowForm(false);
      toast.success(t("Reservation created for {name}.", { name: res.guestName }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Failed to create reservation."));
    } finally {
      setCreating(false);
    }
  }

  function openAssign(r: Reservation) {
    setAssignTo(r.id);
    setAssignRoomId("");
  }
  function cancelAssign() {
    setAssignTo(null);
    setAssignRoomId("");
  }

  async function confirmAssign(r: Reservation) {
    if (!assignRoomId) {
      toast.error(t("Pick a room first."));
      return;
    }
    setAssignBusy(true);
    try {
      const updated = await reservationsApi.checkIn({
        guestFullName:         r.guestName,
        guestPhone:            r.guestPhone,
        roomId:                Number(assignRoomId),
        checkOutDate:          r.checkOutDate,
        existingReservationId: r.id,
      });
      // Refresh both lists — checking in flips a room to Occupied.
      const [reservs, rs] = await Promise.all([
        reservationsApi.getActive(),
        roomsApi.getAll(),
      ]);
      setData(reservs);
      setRooms(rs);
      toast.success(t("{name} checked into room {room}.", { name: updated.guestName, room: updated.roomNumber ?? "" }));
      cancelAssign();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Failed to assign room."));
    } finally {
      setAssignBusy(false);
    }
  }

  const pending   = data.filter(r => r.status === "Pending");
  const checkedIn = data.filter(r => r.status === "CheckedIn");

  return (
    <div>
      <PageHeader
        title={t("Reservations")}
        subtitle={data.length === 1
          ? t("{n} active booking", { n: data.length })
          : t("{n} active bookings", { n: data.length })}
        action={
          <GoldButton
            size="sm"
            icon={<Phone size={14} />}
            onClick={() => setShowForm(p => !p)}
          >
            {showForm ? t("Cancel") : t("Phone booking")}
          </GoldButton>
        }
      />

      {/* Inline phone booking form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader
            title={t("New phone booking")}
            subtitle={t("Guest calls to reserve — no room yet")}
            icon={<Phone size={16} />}
          />
          <div className="p-6">
            <form onSubmit={handlePhoneBooking}
              className="grid grid-cols-2 gap-4">
              <Input
                label={t("Guest full name")}
                placeholder={t("Full name")}
                value={form.guestFullName}
                error={formErrors.guestFullName}
                onChange={e => {
                  setForm(p => ({ ...p, guestFullName: e.target.value }));
                  setFormErrors(p => ({ ...p, guestFullName: "" }));
                }}
              />
              <Input
                label={t("Phone")}
                placeholder="+1 555 000 0000"
                value={form.guestPhone}
                error={formErrors.guestPhone}
                onChange={e => {
                  setForm(p => ({ ...p, guestPhone: e.target.value }));
                  setFormErrors(p => ({ ...p, guestPhone: "" }));
                }}
              />
              <Input
                label={t("Expected check-in")}
                type="date"
                value={form.checkInDate}
                error={formErrors.checkInDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={e => {
                  setForm(p => ({ ...p, checkInDate: e.target.value }));
                  setFormErrors(p => ({ ...p, checkInDate: "" }));
                }}
              />
              <Input
                label={t("Expected check-out")}
                type="date"
                value={form.checkOutDate}
                error={formErrors.checkOutDate}
                min={form.checkInDate || new Date().toISOString().split("T")[0]}
                onChange={e => {
                  setForm(p => ({ ...p, checkOutDate: e.target.value }));
                  setFormErrors(p => ({ ...p, checkOutDate: "" }));
                }}
              />
              <div className="col-span-2 flex justify-end">
                <GoldButton type="submit" loading={creating}>
                  {t("Create reservation")}
                </GoldButton>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
        <div style={{
          background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: "12px",
          padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px",
        }}>
          <div style={{ padding: "10px", background: "#dfe9ec", borderRadius: "10px" }}>
            <Phone size={16} style={{ color: "#155160" }} />
          </div>
          <div>
            <p style={{ fontSize: "22px", fontWeight: 700, color: "#0e2638" }}>{pending.length}</p>
            <p style={{ fontSize: "11px", color: "#6f7c89" }}>{t("Pending (phone)")}</p>
          </div>
        </div>
        <div style={{
          background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: "12px",
          padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px",
        }}>
          <div style={{ padding: "10px", background: "#e2efd1", borderRadius: "10px" }}>
            <DoorOpen size={16} style={{ color: "#2f5d0f" }} />
          </div>
          <div>
            <p style={{ fontSize: "22px", fontWeight: 700, color: "#0e2638" }}>{checkedIn.length}</p>
            <p style={{ fontSize: "11px", color: "#6f7c89" }}>{t("Currently checked in")}</p>
          </div>
        </div>
      </div>

      {(() => {
        const target = data.find(r => r.id === assignTo);
        if (!target) return null;
        return (
          <AssignRoomModal
            key={target.id}
            reservation={target}
            rooms={availableRooms}
            value={assignRoomId}
            onSelect={setAssignRoomId}
            onCancel={cancelAssign}
            onConfirm={() => confirmAssign(target)}
            busy={assignBusy}
          />
        );
      })()}

      <div className="table-wrap">
        {loading && <Spinner />}

        {!loading && error && (
          <div style={{ padding: "40px 24px", textAlign: "center", fontSize: "13px", color: "#8e2424" }}>{error}</div>
        )}

        {!loading && !error && data.length === 0 && (
          <EmptyState
            icon={<CalendarCheck size={28} />}
            title={t("No active reservations")}
            description={t("Reservations will appear here once created.")}
          />
        )}

        {!loading && !error && data.length > 0 && (
          <table>
            <thead>
              <tr>
                {["Guest", "Room", "Check-in", "Check-out", "Source", "Status", ""].map(h => (
                  <th key={h}>{h ? t(h) : ""}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(r => {
                const canAssign = r.status === "Pending";
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                          <div style={{ fontSize: "10px", color: "#6f7c89" }}>{r.guestPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {r.roomNumber ?? <span style={{ color: "#bbb" }}>—</span>}
                    </td>
                    <td style={{ color: "#465766" }}>
                      {formatDate(r.checkInDate)}
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
                    <td>
                      <Badge
                        label={r.status === "CheckedIn" ? t("Checked in") : t(r.status)}
                        variant={statusVariant(r.status)}
                      />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {canAssign && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<DoorOpen size={12} />}
                          onClick={() => openAssign(r)}
                        >
                          {t("Assign room")}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Centered modal for assigning a room to a pending reservation.      */
/* ------------------------------------------------------------------ */

interface AssignRoomModalProps {
  reservation: Reservation;
  rooms: Room[];
  value: string;
  busy: boolean;
  onSelect: (id: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function AssignRoomModal({
  reservation, rooms, value, busy,
  onSelect, onCancel, onConfirm,
}: AssignRoomModalProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Autofocus the search input once on mount.
  useEffect(() => {
    const focusTimer = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(focusTimer);
  }, []);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(r =>
      r.roomNumber.toLowerCase().includes(q)
      || r.type.toLowerCase().includes(q),
    );
  }, [rooms, query]);

  const selected = rooms.find(r => String(r.id) === value) ?? null;

  return (
    <div
      onClick={() => !busy && onCancel()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 14, 12, 0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "520px",
          maxHeight: "calc(100vh - 48px)",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRadius: "14px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "0.5px solid rgba(0,0,0,0.08)",
          background: "#fbf8f2",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "9px",
              background: "#dfe9ec", color: "#155160",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BedDouble size={15} />
            </div>
            <div>
              <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#0e2638" }}>
                {t("Assign a room")}
              </h2>
              <p style={{ fontSize: "11px", color: "#6f7c89", marginTop: "2px" }}>
                {reservation.guestName} · {reservation.guestPhone}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label={t("Close")}
            style={{
              width: "30px", height: "30px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "none",
              color: "#465766", borderRadius: "8px",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{
          padding: "12px 16px",
          borderBottom: "0.5px solid rgba(0,0,0,0.06)",
          position: "relative",
          background: "#fff",
        }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              insetInlineStart: "26px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#6f7c89",
              pointerEvents: "none",
            }}
          />
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t("Search by room number or type…")}
            style={{
              width: "100%",
              paddingBlock: "9px",
              paddingInlineStart: "34px",
              paddingInlineEnd: "12px",
              fontSize: "13px",
              background: "#fbf8f2",
              color: "#222",
              border: "0.5px solid rgba(0,0,0,0.1)",
              borderRadius: "8px",
              outline: "none",
            }}
          />
        </div>

        {/* Room list */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {rooms.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "#6f7c89", fontSize: "13px" }}>
              {t("No rooms are currently available.")}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "#6f7c89", fontSize: "13px" }}>
              {t("No rooms match “{q}”.", { q: query })}
            </div>
          ) : (
            <ul style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {filtered.map(room => {
                const isSelected = String(room.id) === value;
                return (
                  <li key={room.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(String(room.id))}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        padding: "11px 12px",
                        fontSize: "13px",
                        background: isSelected ? "#e7f0f2" : "#fff",
                        color: "#222",
                        border: `0.5px solid ${isSelected ? "rgba(21, 81, 96, 0.3)" : "rgba(0,0,0,0.07)"}`,
                        borderRadius: "10px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          (e.currentTarget as HTMLButtonElement).style.background = "#fbf8f2";
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                        }
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                        <span style={{
                          width: "26px", height: "26px", borderRadius: "8px",
                          background: isSelected ? "#155160" : "#dfe9ec",
                          color: isSelected ? "#fff" : "#155160",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {isSelected
                            ? <Check size={13} />
                            : <BedDouble size={13} />}
                        </span>
                        <span style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600 }}>{t("Room {n}", { n: room.roomNumber })}</span>
                          <span style={{ fontSize: "11px", color: "#6f7c89" }}>{room.type}</span>
                        </span>
                      </span>
                      <span style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#155160",
                      }}>
                        {egp(room.pricePerNight)}/{t("night")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          padding: "12px 16px",
          borderTop: "0.5px solid rgba(0,0,0,0.06)",
          background: "#fbf8f2",
        }}>
          <div style={{ fontSize: "11px", color: "#6f7c89" }}>
            {selected
              ? <>{t("Selected")} <strong style={{ color: "#222" }}>{t("Room {n}", { n: selected.roomNumber })}</strong></>
              : t("Pick a room to continue")}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={busy}
            >
              {t("Cancel")}
            </Button>
            <Button
              variant="gold"
              size="sm"
              icon={<Check size={12} />}
              loading={busy}
              disabled={!value}
              onClick={onConfirm}
            >
              {t("Check in")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
