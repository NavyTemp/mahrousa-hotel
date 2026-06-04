"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { reservationsApi, roomsApi } from "@/lib/api";
import { egp } from "@/lib/money";
import type { Room, Reservation } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { GoldButton, Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/context/LanguageContext";
import {
  DoorOpen, Phone, CheckCircle2, CalendarDays, ArrowRight,
} from "lucide-react";

function today() {
  return new Date().toISOString().split("T")[0];
}

const EMPTY_WALKIN = {
  guestFullName: "",
  guestPhone:    "",
  nationalId:    "",
  roomId:        "",
  checkInDate:   today(),
  checkOutDate:  "",
};

const EMPTY_PHONE = {
  guestFullName: "",
  guestPhone:    "",
  checkInDate:   "",
  checkOutDate:  "",
};

export default function CheckInPage() {
  const toast = useToast();
  const { t } = useI18n();
  const [rooms,       setRooms]       = useState<Room[]>([]);
  const [roomsLoading,setRoomsLoading]= useState(true);

  // Walk-in form
  const [wi,        setWi]        = useState(EMPTY_WALKIN);
  const [wiLoading, setWiLoading] = useState(false);
  const [wiErrors,  setWiErrors]  = useState<Partial<typeof EMPTY_WALKIN>>({});
  const [wiSuccess, setWiSuccess] = useState<Reservation | null>(null);

  // Phone booking form (creates a Pending reservation — no room yet)
  const [ph,        setPh]        = useState(EMPTY_PHONE);
  const [phLoading, setPhLoading] = useState(false);
  const [phErrors,  setPhErrors]  = useState<Partial<typeof EMPTY_PHONE>>({});
  const [phSuccess, setPhSuccess] = useState<Reservation | null>(null);

  const available = rooms.filter(r => r.status === "Available");

  useEffect(() => {
    roomsApi.getAll()
      .then(setRooms)
      .catch(() => toast.error(t("Failed to load rooms.")))
      .finally(() => setRoomsLoading(false));
  }, []);

  // ── Walk-in submit ────────────────────────────────────────────────────
  function validateWi() {
    const e: Partial<typeof EMPTY_WALKIN> = {};
    if (!wi.guestFullName.trim()) e.guestFullName = t("Name is required.");
    if (!wi.guestPhone.trim())    e.guestPhone    = t("Phone is required.");
    if (!wi.roomId)               e.roomId        = t("Select a room.");
    if (!wi.checkInDate)          e.checkInDate   = t("Check-in date is required.");
    if (!wi.checkOutDate)         e.checkOutDate  = t("Check-out date is required.");
    if (wi.checkInDate && wi.checkOutDate && wi.checkOutDate <= wi.checkInDate) {
      e.checkOutDate = t("Check-out must be after check-in.");
    }
    return e;
  }

  async function handleWalkIn(e: FormEvent) {
    e.preventDefault();
    const errs = validateWi();
    if (Object.keys(errs).length) { setWiErrors(errs); return; }
    setWiLoading(true);
    try {
      const res = await reservationsApi.checkIn({
        guestFullName:         wi.guestFullName,
        guestPhone:            wi.guestPhone,
        nationalId:            wi.nationalId || undefined,
        roomId:                Number(wi.roomId),
        checkInDate:           new Date(wi.checkInDate).toISOString(),
        checkOutDate:          new Date(wi.checkOutDate).toISOString(),
        existingReservationId: null,
      });
      setWiSuccess(res);
      setWi(EMPTY_WALKIN);
      toast.success(t("{name} checked into room {room}.", { name: res.guestName, room: res.roomNumber ?? "" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Check-in failed."));
    } finally {
      setWiLoading(false);
    }
  }

  // ── Phone booking submit ──────────────────────────────────────────────
  function validatePh() {
    const e: Partial<typeof EMPTY_PHONE> = {};
    if (!ph.guestFullName.trim()) e.guestFullName = t("Name is required.");
    if (!ph.guestPhone.trim())    e.guestPhone    = t("Phone is required.");
    if (!ph.checkInDate)          e.checkInDate   = t("Check-in date is required.");
    if (!ph.checkOutDate)         e.checkOutDate  = t("Check-out date is required.");
    if (ph.checkInDate && ph.checkOutDate && ph.checkOutDate <= ph.checkInDate) {
      e.checkOutDate = t("Check-out must be after check-in.");
    }
    return e;
  }

  async function handlePhoneBooking(e: FormEvent) {
    e.preventDefault();
    const errs = validatePh();
    if (Object.keys(errs).length) { setPhErrors(errs); return; }
    setPhLoading(true);
    try {
      const res = await reservationsApi.phoneBooking({
        guestFullName: ph.guestFullName,
        guestPhone:    ph.guestPhone,
        checkInDate:   new Date(ph.checkInDate).toISOString(),
        checkOutDate:  new Date(ph.checkOutDate).toISOString(),
      });
      setPhSuccess(res);
      setPh(EMPTY_PHONE);
      toast.success(t("Phone booking #{id} created for {name}.", { id: res.id, name: res.guestName }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Failed to create reservation."));
    } finally {
      setPhLoading(false);
    }
  }

  const roomOptions = available.map(r => (
    <option key={r.id} value={r.id}>
      {t("Room {n}", { n: r.roomNumber })} — {r.type} ({egp(r.pricePerNight)}/{t("night")})
    </option>
  ));

  return (
    <div>
      <PageHeader
        title={t("Check-in")}
        subtitle={available.length === 1
          ? t("{n} room available", { n: available.length })
          : t("{n} rooms available", { n: available.length })}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>

        {/* ── Walk-in ── */}
        <div style={{
          background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)",
          borderRadius: "12px", overflow: "hidden",
        }}>
          <CardHeader
            title={t("Walk-in guest")}
            subtitle={t("Guest arrives without prior booking")}
            icon={<DoorOpen size={14} />}
          />
          <div style={{ padding: "18px" }}>
            {wiSuccess ? (
              <SuccessBanner
                title={t("{name} is checked in", { name: wiSuccess.guestName })}
                sub={t("Room {n}", { n: wiSuccess.roomNumber ?? "" })}
                checkInDate={wiSuccess.checkInDate}
                checkOutDate={wiSuccess.checkOutDate}
                onNew={() => setWiSuccess(null)}
                newLabel={t("Check in another guest")}
              />
            ) : (
              <form onSubmit={handleWalkIn} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Input
                  label={t("Full name")}
                  placeholder={t("Guest full name")}
                  value={wi.guestFullName}
                  error={wiErrors.guestFullName}
                  onChange={e => {
                    setWi(p => ({ ...p, guestFullName: e.target.value }));
                    setWiErrors(p => ({ ...p, guestFullName: "" }));
                  }}
                />
                <Input
                  label={t("Phone")}
                  placeholder="+966 50 123 4567"
                  value={wi.guestPhone}
                  error={wiErrors.guestPhone}
                  onChange={e => {
                    setWi(p => ({ ...p, guestPhone: e.target.value }));
                    setWiErrors(p => ({ ...p, guestPhone: "" }));
                  }}
                />
                <Input
                  label={t("National ID (optional)")}
                  placeholder={t("ID number")}
                  value={wi.nationalId}
                  onChange={e => setWi(p => ({ ...p, nationalId: e.target.value }))}
                />
                <Select
                  label={t("Assign room")}
                  value={wi.roomId}
                  error={wiErrors.roomId}
                  disabled={roomsLoading || available.length === 0}
                  onChange={e => {
                    setWi(p => ({ ...p, roomId: e.target.value }));
                    setWiErrors(p => ({ ...p, roomId: "" }));
                  }}
                >
                  <option value="">
                    {roomsLoading
                      ? t("Loading rooms…")
                      : available.length === 0
                      ? t("No available rooms")
                      : t("Select a room")}
                  </option>
                  {roomOptions}
                </Select>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Input
                    label={t("Check-in date")}
                    type="date"
                    value={wi.checkInDate}
                    error={wiErrors.checkInDate}
                    onChange={e => {
                      setWi(p => ({ ...p, checkInDate: e.target.value }));
                      setWiErrors(p => ({ ...p, checkInDate: "" }));
                    }}
                  />
                  <Input
                    label={t("Check-out date")}
                    type="date"
                    value={wi.checkOutDate}
                    error={wiErrors.checkOutDate}
                    min={wi.checkInDate || today()}
                    onChange={e => {
                      setWi(p => ({ ...p, checkOutDate: e.target.value }));
                      setWiErrors(p => ({ ...p, checkOutDate: "" }));
                    }}
                  />
                </div>

                <GoldButton type="submit" loading={wiLoading} className="w-full mt-1">
                  {t("Check in guest")}
                </GoldButton>
              </form>
            )}
          </div>
        </div>

        {/* ── Phone booking (no room yet) ── */}
        <div style={{
          background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)",
          borderRadius: "12px", overflow: "hidden",
        }}>
          <CardHeader
            title={t("Phone booking")}
            subtitle={t("Reserve now, assign a room later")}
            icon={<Phone size={14} />}
          />
          <div style={{ padding: "18px" }}>
            {phSuccess ? (
              <SuccessBanner
                title={t("Reservation #{id} created", { id: phSuccess.id })}
                sub={`${phSuccess.guestName} — ${phSuccess.guestPhone}`}
                checkInDate={phSuccess.checkInDate}
                checkOutDate={phSuccess.checkOutDate}
                onNew={() => setPhSuccess(null)}
                newLabel={t("Take another booking")}
                footer={
                  <Link
                    href="/reservations"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      color: "#155160",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    {t("Assign a room from Reservations")}
                    <ArrowRight size={12} />
                  </Link>
                }
              />
            ) : (
              <form onSubmit={handlePhoneBooking} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Input
                  label={t("Full name")}
                  placeholder={t("Guest full name")}
                  value={ph.guestFullName}
                  error={phErrors.guestFullName}
                  onChange={e => {
                    setPh(p => ({ ...p, guestFullName: e.target.value }));
                    setPhErrors(p => ({ ...p, guestFullName: "" }));
                  }}
                />
                <Input
                  label={t("Phone")}
                  placeholder="+966 50 123 4567"
                  value={ph.guestPhone}
                  error={phErrors.guestPhone}
                  onChange={e => {
                    setPh(p => ({ ...p, guestPhone: e.target.value }));
                    setPhErrors(p => ({ ...p, guestPhone: "" }));
                  }}
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <Input
                    label={t("Expected check-in")}
                    type="date"
                    value={ph.checkInDate}
                    error={phErrors.checkInDate}
                    min={today()}
                    onChange={e => {
                      setPh(p => ({ ...p, checkInDate: e.target.value }));
                      setPhErrors(p => ({ ...p, checkInDate: "" }));
                    }}
                  />
                  <Input
                    label={t("Expected check-out")}
                    type="date"
                    value={ph.checkOutDate}
                    error={phErrors.checkOutDate}
                    min={ph.checkInDate || today()}
                    onChange={e => {
                      setPh(p => ({ ...p, checkOutDate: e.target.value }));
                      setPhErrors(p => ({ ...p, checkOutDate: "" }));
                    }}
                  />
                </div>

                <div style={{
                  padding: "9px 12px",
                  fontSize: "11px",
                  color: "#465766",
                  background: "#fbf8f2",
                  border: "0.5px solid rgba(0,0,0,0.06)",
                  borderRadius: "8px",
                }}>
                  {t("No room is assigned yet. You can assign one later on the")}{" "}
                  <Link href="/reservations" style={{ color: "#155160", fontWeight: 600 }}>
                    {t("Reservations")}
                  </Link>{" "}
                  {t("page when the guest arrives.")}
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  loading={phLoading}
                  className="w-full mt-1"
                >
                  {t("Create phone booking")}
                </Button>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function SuccessBanner({
  title, sub, checkInDate, checkOutDate, onNew, newLabel, footer,
}: {
  title: string;
  sub: string;
  checkInDate?: string;
  checkOutDate?: string;
  onNew: () => void;
  newLabel?: string;
  footer?: React.ReactNode;
}) {
  const { t } = useI18n();
  function fmt(iso?: string) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
    });
  }

  const inStr  = fmt(checkInDate);
  const outStr = fmt(checkOutDate);

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "28px 0", gap: "12px",
    }}>
      <div style={{
        width: "48px", height: "48px", borderRadius: "50%",
        background: "#e2efd1",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <CheckCircle2 size={24} style={{ color: "#2f5d0f" }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "#0e2638" }}>{title}</p>
        <p style={{ fontSize: "11px", color: "#6f7c89", marginTop: "4px" }}>{sub}</p>
      </div>
      {(inStr || outStr) && (
        <div style={{
          display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center",
        }}>
          {inStr && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "6px 12px",
              background: "#e2efd1", border: "0.5px solid rgba(59, 109, 17, 0.15)",
              borderRadius: "999px",
              fontSize: "11px", color: "#2f5d0f", fontWeight: 600,
            }}>
              <CalendarDays size={12} />
              {t("Check-in: {date}", { date: inStr })}
            </span>
          )}
          {outStr && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "6px 12px",
              background: "#e7f0f2", border: "0.5px solid rgba(21, 81, 96, 0.15)",
              borderRadius: "999px",
              fontSize: "11px", color: "#155160", fontWeight: 600,
            }}>
              <CalendarDays size={12} />
              {t("Check-out: {date}", { date: outStr })}
            </span>
          )}
        </div>
      )}
      {footer}
      <Button variant="ghost" size="sm" onClick={onNew}>
        {newLabel ?? t("New entry")}
      </Button>
    </div>
  );
}
