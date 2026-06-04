"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { hallBookingsApi, hallsApi } from "@/lib/api";
import { egp } from "@/lib/money";
import type { Hall, HallBooking, HallBookingStatus } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { GoldButton, Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/context/LanguageContext";
import {
  PartyPopper, Users, CalendarClock, Check, X, CheckCircle2, Hourglass,
} from "lucide-react";

/* datetime-local wants "YYYY-MM-DDTHH:mm" in local time. */
function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/* Hours billed: rounded up to the next full hour, minimum 1 (mirrors backend). */
function billedHours(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 3_600_000));
}

/* Map our hall statuses onto the existing Badge palette. */
const BADGE_SRC: Record<HallBookingStatus, string> = {
  Pending:   "pending",     // amber
  Confirmed: "checkedin",   // green
  Completed: "checkedout",  // gray
  Cancelled: "cancelled",   // red
};

const EMPTY_FORM = {
  hallId: "",
  customerName: "",
  customerPhone: "",
  attendeeCount: "",
  purpose: "",
  startTime: "",
  endTime: "",
};

export default function HallBookingsPage() {
  const toast = useToast();
  const { t } = useI18n();
  const [data,    setData]    = useState<HallBooking[]>([]);
  const [halls,   setHalls]   = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [creating, setCreating] = useState(false);

  // Which booking row currently has an action running.
  const [busyId, setBusyId] = useState<number | null>(null);

  const bookableHalls = halls.filter(h => h.status === "Available");

  useEffect(() => {
    Promise.all([hallBookingsApi.getActive(), hallsApi.getAll()])
      .then(([bookings, hs]) => { setData(bookings); setHalls(hs); })
      .catch(e => setError(e instanceof Error ? e.message : t("Failed to load.")))
      .finally(() => setLoading(false));
  }, []);

  const selectedHall = useMemo(
    () => halls.find(h => String(h.id) === form.hallId) ?? null,
    [halls, form.hallId],
  );

  const hours = form.startTime && form.endTime
    ? billedHours(form.startTime, form.endTime)
    : 0;
  const pricePreview = selectedHall && hours > 0
    ? selectedHall.hourlyRate * hours
    : 0;
  const overCapacity = !!selectedHall
    && !!form.attendeeCount
    && Number(form.attendeeCount) > selectedHall.capacity;

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm(p => ({ ...p, [key]: value }));
    setFormErrors(p => ({ ...p, [key]: "" }));
  }

  function validate() {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!form.hallId)               e.hallId        = t("Select a hall.");
    if (!form.customerName.trim())  e.customerName  = t("Required.");
    if (!form.customerPhone.trim()) e.customerPhone = t("Required.");
    if (!form.attendeeCount)        e.attendeeCount = t("Required.");
    else if (Number(form.attendeeCount) <= 0) e.attendeeCount = t("Must be at least 1.");
    else if (selectedHall && Number(form.attendeeCount) > selectedHall.capacity)
      e.attendeeCount = t("Max {n} for this hall.", { n: selectedHall.capacity });
    if (!form.startTime)            e.startTime     = t("Required.");
    if (!form.endTime)              e.endTime       = t("Required.");
    else if (form.startTime && form.endTime <= form.startTime)
      e.endTime = t("End must be after start.");
    return e;
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    setCreating(true);
    try {
      const res = await hallBookingsApi.create({
        hallId:        Number(form.hallId),
        customerName:  form.customerName,
        customerPhone: form.customerPhone,
        attendeeCount: Number(form.attendeeCount),
        startTime:     new Date(form.startTime).toISOString(),
        endTime:       new Date(form.endTime).toISOString(),
        purpose:       form.purpose.trim() || undefined,
      });
      setData(prev => [res, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success(t("Hall booked: {hall} for {customer}.", { hall: res.hallName, customer: res.customerName }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Failed to create booking."));
    } finally {
      setCreating(false);
    }
  }

  async function runAction(
    id: number,
    action: (id: number) => Promise<HallBooking>,
    successMsg: string,
  ) {
    setBusyId(id);
    try {
      await action(id);
      // Re-fetch: confirm keeps the row, complete/cancel drop it from the active list.
      const bookings = await hallBookingsApi.getActive();
      setData(bookings);
      toast.success(successMsg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Action failed."));
    } finally {
      setBusyId(null);
    }
  }

  const pending   = data.filter(b => b.status === "Pending");
  const confirmed = data.filter(b => b.status === "Confirmed");

  return (
    <div>
      <PageHeader
        title={t("Hall bookings")}
        subtitle={data.length === 1
          ? t("{n} active booking", { n: data.length })
          : t("{n} active bookings", { n: data.length })}
        action={
          <GoldButton
            size="sm"
            icon={<PartyPopper size={14} />}
            onClick={() => setShowForm(p => !p)}
          >
            {showForm ? t("Cancel") : t("New booking")}
          </GoldButton>
        }
      />

      {/* Inline create form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader
            title={t("New hall booking")}
            subtitle={t("Reserve an event space for a customer")}
            icon={<PartyPopper size={16} />}
          />
          <div className="p-6">
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <Select
                label={t("Hall")}
                value={form.hallId}
                error={formErrors.hallId}
                disabled={bookableHalls.length === 0}
                onChange={e => setField("hallId", e.target.value)}
              >
                <option value="">
                  {bookableHalls.length === 0 ? t("No halls available") : t("Select a hall")}
                </option>
                {bookableHalls.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {t("up to {n}", { n: h.capacity })} · {egp(h.hourlyRate)}/{t("hr")}
                  </option>
                ))}
              </Select>
              <Input
                label={t("Attendees")}
                type="number"
                min={1}
                placeholder={t("e.g. 150")}
                value={form.attendeeCount}
                error={formErrors.attendeeCount}
                onChange={e => setField("attendeeCount", e.target.value)}
              />
              <Input
                label={t("Customer name")}
                placeholder={t("Full name")}
                value={form.customerName}
                error={formErrors.customerName}
                onChange={e => setField("customerName", e.target.value)}
              />
              <Input
                label={t("Customer phone")}
                placeholder="+20 100 000 0000"
                value={form.customerPhone}
                error={formErrors.customerPhone}
                onChange={e => setField("customerPhone", e.target.value)}
              />
              <Input
                label={t("Start")}
                type="datetime-local"
                value={form.startTime}
                error={formErrors.startTime}
                min={nowLocal()}
                onChange={e => setField("startTime", e.target.value)}
              />
              <Input
                label={t("End")}
                type="datetime-local"
                value={form.endTime}
                error={formErrors.endTime}
                min={form.startTime || nowLocal()}
                onChange={e => setField("endTime", e.target.value)}
              />
              <Input
                label={t("Purpose (optional)")}
                placeholder={t("Wedding, conference, …")}
                value={form.purpose}
                onChange={e => setField("purpose", e.target.value)}
              />

              {/* Live price / capacity preview */}
              <div style={{
                display: "flex", flexDirection: "column", justifyContent: "flex-end",
                gap: "6px",
              }}>
                <div style={{
                  padding: "10px 12px",
                  background: overCapacity ? "#fbeaea" : "#fbf8f2",
                  border: `0.5px solid ${overCapacity ? "rgba(168,52,50,0.25)" : "rgba(0,0,0,0.08)"}`,
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: overCapacity ? "#8e2424" : "#465766",
                }}>
                  {overCapacity ? (
                    <>{t("Over capacity — {name} seats {cap}.", { name: selectedHall?.name ?? "", cap: selectedHall?.capacity ?? 0 })}</>
                  ) : pricePreview > 0 ? (
                    <>{t("Estimated total:")} <strong style={{ color: "#155160" }}>{egp(pricePreview)}</strong>{" "}
                      ({hours === 1 ? t("{n} hour", { n: hours }) : t("{n} hours", { n: hours })})</>
                  ) : (
                    <>{t("Pick a hall and times to see the price.")}</>
                  )}
                </div>
              </div>

              <div className="col-span-2 flex justify-end">
                <GoldButton type="submit" loading={creating}>
                  {t("Create booking")}
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
          <div style={{ padding: "10px", background: "#f6e9c9", borderRadius: "10px" }}>
            <Hourglass size={16} style={{ color: "#8a6d1f" }} />
          </div>
          <div>
            <p style={{ fontSize: "22px", fontWeight: 700, color: "#0e2638" }}>{pending.length}</p>
            <p style={{ fontSize: "11px", color: "#6f7c89" }}>{t("Pending")}</p>
          </div>
        </div>
        <div style={{
          background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: "12px",
          padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px",
        }}>
          <div style={{ padding: "10px", background: "#e2efd1", borderRadius: "10px" }}>
            <CheckCircle2 size={16} style={{ color: "#2f5d0f" }} />
          </div>
          <div>
            <p style={{ fontSize: "22px", fontWeight: 700, color: "#0e2638" }}>{confirmed.length}</p>
            <p style={{ fontSize: "11px", color: "#6f7c89" }}>{t("Confirmed")}</p>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        {loading && <Spinner />}

        {!loading && error && (
          <div style={{ padding: "40px 24px", textAlign: "center", fontSize: "13px", color: "#8e2424" }}>{error}</div>
        )}

        {!loading && !error && data.length === 0 && (
          <EmptyState
            icon={<PartyPopper size={28} />}
            title={t("No active hall bookings")}
            description={t("Create a booking to reserve an event space.")}
          />
        )}

        {!loading && !error && data.length > 0 && (
          <table>
            <thead>
              <tr>
                {["Hall", "Customer", "When", "Guests", "Total", "Status", ""].map(h => (
                  <th key={h}>{h ? t(h) : ""}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(b => {
                const rowBusy = busyId === b.id;
                return (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "12px", color: "#0e2638" }}>
                        {b.hallName}
                      </div>
                      {b.purpose && (
                        <div style={{ fontSize: "10px", color: "#6f7c89" }}>{b.purpose}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: "12px" }}>{b.customerName}</div>
                      <div style={{ fontSize: "10px", color: "#6f7c89" }}>{b.customerPhone}</div>
                    </td>
                    <td style={{ color: "#465766", fontSize: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <CalendarClock size={12} style={{ color: "#1f6675" }} />
                        {formatDateTime(b.startTime)}
                      </div>
                      <div style={{ fontSize: "10px", color: "#8a97a3", marginLeft: "18px" }}>
                        → {formatDateTime(b.endTime)}
                      </div>
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px" }}>
                        <Users size={12} style={{ color: "#6f7c89" }} />
                        {b.attendeeCount}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: "#155160", fontSize: "12px" }}>
                      {egp(b.totalPrice)}
                    </td>
                    <td>
                      <Badge label={t(b.status)} variant={statusVariant(BADGE_SRC[b.status])} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px", justifyContent: "flex-end" }}>
                        {b.status === "Pending" && (
                          <Button
                            variant="secondary" size="sm" icon={<Check size={12} />}
                            disabled={rowBusy}
                            onClick={() => runAction(b.id, hallBookingsApi.confirm, t("Booking #{id} confirmed.", { id: b.id }))}
                          >
                            {t("Confirm")}
                          </Button>
                        )}
                        {(b.status === "Pending" || b.status === "Confirmed") && (
                          <>
                            <Button
                              variant="secondary" size="sm" icon={<CheckCircle2 size={12} />}
                              disabled={rowBusy}
                              onClick={() => runAction(b.id, hallBookingsApi.complete, t("Booking #{id} completed.", { id: b.id }))}
                            >
                              {t("Complete")}
                            </Button>
                            <Button
                              variant="danger" size="sm" icon={<X size={12} />}
                              disabled={rowBusy}
                              onClick={() => runAction(b.id, hallBookingsApi.cancel, t("Booking #{id} cancelled.", { id: b.id }))}
                            >
                              {t("Cancel")}
                            </Button>
                          </>
                        )}
                      </div>
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
