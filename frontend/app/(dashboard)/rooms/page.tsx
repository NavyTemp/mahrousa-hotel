"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { roomsApi, roomFeaturesApi } from "@/lib/api";
import { egp } from "@/lib/money";
import {
  decorateRoomFeatures,
  getFeatureLabel,
} from "@/lib/roomFeatures";
import {
  ALL_ROOM_FEATURE_TYPES,
  type Room,
  type RoomStatus,
  type RoomFeature,
  type RoomFeatureType,
} from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Button, GoldButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/LanguageContext";
import { Building2, Settings2, Trash2, Plus, X } from "lucide-react";

type Filter = "All" | RoomStatus;

const FILTERS: Filter[] = ["All", "Available", "Occupied", "Dirty", "Maintenance"];

const LEGEND: { label: string; color: string }[] = [
  { label: "Available",   color: "bg-[#57a23f]" },
  { label: "Occupied",    color: "bg-[#2f78c7]"  },
  { label: "Dirty",       color: "bg-[#c47a3b]" },
  { label: "Maintenance", color: "bg-[#c9423f]"   },
];

export default function RoomsPage() {
  const { t } = useI18n();
  const { isRole } = useAuth();
  const [rooms,   setRooms]   = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [filter,  setFilter]  = useState<Filter>("All");

  // Which room is currently being edited by an admin. null = no editor open.
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const canEditFeatures = isRole("Admin");

  useEffect(() => {
    roomsApi.getAll()
      .then(setRooms)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Push an updated features list for one room into the room list state, so
  // closing the editor leaves the grid showing the latest contents.
  function applyFeatureUpdate(roomId: number, features: RoomFeature[]) {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, features } : r));
  }

  const filtered = filter === "All"
    ? rooms
    : rooms.filter(r => r.status === filter);

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <PageHeader
            title={t("Rooms")}
            subtitle={t("{n} rooms across 3 floors", { n: rooms.length })}
          />
        </div>
        <div className="filter-buttons">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-btn ${filter === f ? "active" : ""}`}
            >
              {t(f)}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="legend">
        {LEGEND.map(l => (
          <div key={l.label} className="legend-item">
            <div className={`legend-dot ${l.color}`} />
            {t(l.label)}
          </div>
        ))}
      </div>

      {loading && <Spinner />}

      {!loading && error && (
        <p className="text-sm text-red-500 text-center py-10">{error}</p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<Building2 size={28} />}
          title={t("No rooms found")}
          description={t("No rooms with status \"{status}\".", { status: t(filter) })}
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="rooms-grid">
          {filtered.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              canEditFeatures={canEditFeatures}
              onEditFeatures={() => setEditingRoom(room)}
            />
          ))}
        </div>
      )}

      {editingRoom && (
        <RoomFeaturesEditor
          room={editingRoom}
          onClose={() => setEditingRoom(null)}
          onChange={features => {
            applyFeatureUpdate(editingRoom.id, features);
            // Keep the editor open against the latest data so subsequent
            // actions act on the up-to-date list.
            setEditingRoom(prev => prev ? { ...prev, features } : prev);
          }}
        />
      )}
    </div>
  );
}

function RoomCard({
  room,
  canEditFeatures,
  onEditFeatures,
}: {
  room: Room;
  canEditFeatures: boolean;
  onEditFeatures: () => void;
}) {
  const { t } = useI18n();
  const features = decorateRoomFeatures(room.features ?? []);
  // Show the first 4 amenities as inline chips; the rest collapse into "+N".
  const visible = features.slice(0, 4);
  const extra = features.length - visible.length;

  return (
    <div className={`room-card ${room.status.toLowerCase()}`}>
      <div className="room-card-top">
        <div>
          <div className="room-card-num">{room.roomNumber}</div>
          <div className="room-card-type">{t(room.type)}</div>
        </div>
        <Badge
          label={t(room.status)}
          variant={statusVariant(room.status)}
        />
      </div>

      {features.length > 0 && (
        <div className="room-card-features" title={features.map(f => `${f.quantity}× ${t(f.label)}`).join(" • ")}>
          {visible.map(f => (
            <span key={f.id} className="room-card-feature">
              <f.icon size={11} />
              {f.quantity > 1 ? `${f.quantity}× ${t(f.label)}` : t(f.label)}
            </span>
          ))}
          {extra > 0 && (
            <span className="room-card-feature room-card-feature-more">
              {t("+{n} more", { n: extra })}
            </span>
          )}
        </div>
      )}

      <div className="room-card-price">
        <span>{egp(room.pricePerNight)}</span> / {t("night")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {room.status === "Available" ? (
          <Link href="/checkin">
            <button className="room-card-action gold">
              {t("Check in")}
            </button>
          </Link>
        ) : room.status === "Dirty" ? (
          <button className="room-card-action">
            {t("Mark clean")}
          </button>
        ) : room.status === "Maintenance" ? (
          <button className="room-card-action">
            {t("Resolve")}
          </button>
        ) : (
          <button className="room-card-action" disabled>
            {t(room.status)}
          </button>
        )}

        {canEditFeatures && (
          <button
            type="button"
            onClick={onEditFeatures}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "7px 10px",
              fontSize: "11px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "1px solid rgba(14, 38, 56, 0.14)",
              background: "#fff",
              color: "#0e2638",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Settings2 size={12} />
            {t("Edit contents")}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin-only modal: manage one room's physical contents (beds, TV, etc.).
// The backend treats POST as an upsert on (RoomId, Type), so the "Add" form
// doubles as a quantity/notes editor: pick an existing type to overwrite it.
// ─────────────────────────────────────────────────────────────────────────────
function RoomFeaturesEditor({
  room,
  onClose,
  onChange,
}: {
  room: Room;
  onClose: () => void;
  onChange: (features: RoomFeature[]) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();

  const [features, setFeatures] = useState<RoomFeature[]>(room.features ?? []);
  const [type, setType] = useState<RoomFeatureType>(
    pickDefaultType(room.features ?? []),
  );
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Pull the freshest list whenever a different room is opened. We avoid
  // synchronous state updates inside the effect body and rely on `.then` so
  // React doesn't see a cascading render.
  useEffect(() => {
    let cancelled = false;
    roomFeaturesApi.getByRoom(room.id)
      .then(fresh => {
        if (cancelled) return;
        setFeatures(fresh);
        onChange(fresh);
      })
      .catch(() => { /* surface via toast if the next action fails */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  const decorated = decorateRoomFeatures(features);
  const existingForType = features.find(f => f.type === type);
  const isUpdate = !!existingForType;

  async function handleSubmit(payload: { quantity: number; notes: string }) {
    if (payload.quantity < 1) {
      toast.error(t("Quantity must be at least 1."));
      return;
    }
    setSubmitting(true);
    try {
      const saved = await roomFeaturesApi.upsert(room.id, {
        type,
        quantity: payload.quantity,
        notes: payload.notes.trim() === "" ? null : payload.notes.trim(),
      });
      const next = features.some(f => f.id === saved.id)
        ? features.map(f => f.id === saved.id ? saved : f)
        : [...features.filter(f => f.type !== saved.type), saved];
      setFeatures(next);
      onChange(next);
      toast.success(isUpdate
        ? t("Updated {label} for room {n}.",
            { label: t(getFeatureLabel(type)), n: room.roomNumber })
        : t("Added {label} to room {n}.",
            { label: t(getFeatureLabel(type)), n: room.roomNumber }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Failed to save feature."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(feature: RoomFeature) {
    setDeletingId(feature.id);
    try {
      await roomFeaturesApi.remove(room.id, feature.id);
      const next = features.filter(f => f.id !== feature.id);
      setFeatures(next);
      onChange(next);
      toast.success(t("Removed {label} from room {n}.",
        { label: t(getFeatureLabel(feature.type)), n: room.roomNumber }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Failed to remove feature."));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 80,
        background: "rgba(14, 38, 56, 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: "14px",
        width: "100%", maxWidth: "560px",
        maxHeight: "calc(100vh - 48px)",
        display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(14, 38, 56, 0.35)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "0.5px solid rgba(0,0,0,0.1)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: "10px", color: "#6f7c89", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t("Edit contents")}
            </div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#0e2638" }}>
              {t("Room {n}", { n: room.roomNumber })} · {t(room.type)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close")}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "#6f7c89", padding: "4px", borderRadius: "6px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Current features */}
        <div style={{
          padding: "16px 20px",
          flex: 1, overflowY: "auto",
        }}>
          <div style={{
            fontSize: "10px", fontWeight: 600, color: "#1f6675",
            textTransform: "uppercase", letterSpacing: "0.06em",
            marginBottom: "10px",
          }}>
            {t("Current contents")}
          </div>

          {decorated.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#6f7c89" }}>
              {t("This room has no recorded contents yet. Add one below.")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {decorated.map(f => (
                <div key={f.id} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "8px 10px",
                  background: "#f7f8fa", borderRadius: "8px",
                  border: "0.5px solid rgba(0,0,0,0.06)",
                }}>
                  <f.icon size={14} style={{ color: "#1f6675", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "#0e2638" }}>
                      {t(f.label)}
                      {f.quantity > 1 && (
                        <span style={{
                          marginLeft: "6px", fontSize: "10px", fontWeight: 600,
                          padding: "1px 6px", borderRadius: "999px",
                          background: "#1f667514", color: "#1f6675",
                        }}>
                          × {f.quantity}
                        </span>
                      )}
                    </div>
                    {f.notes && (
                      <div style={{ fontSize: "10.5px", color: "#6f7c89", marginTop: "1px" }}>
                        {f.notes}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm" variant="ghost"
                    icon={<Trash2 size={12} />}
                    loading={deletingId === f.id}
                    onClick={() => handleDelete(f)}
                  >
                    {t("Remove")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add / update form. Keyed by `type` so the input state resets to the
            chosen feature's current values whenever the dropdown changes. */}
        <FeatureUpsertForm
          key={type}
          features={features}
          type={type}
          onTypeChange={setType}
          initialQuantity={existingForType?.quantity ?? 1}
          initialNotes={existingForType?.notes ?? ""}
          isUpdate={isUpdate}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

function FeatureUpsertForm({
  features,
  type,
  onTypeChange,
  initialQuantity,
  initialNotes,
  isUpdate,
  submitting,
  onSubmit,
}: {
  features: RoomFeature[];
  type: RoomFeatureType;
  onTypeChange: (t: RoomFeatureType) => void;
  initialQuantity: number;
  initialNotes: string;
  isUpdate: boolean;
  submitting: boolean;
  onSubmit: (payload: { quantity: number; notes: string }) => void;
}) {
  const { t } = useI18n();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [notes, setNotes] = useState(initialNotes);

  function handle(e: FormEvent) {
    e.preventDefault();
    onSubmit({ quantity, notes });
  }

  return (
    <form
      onSubmit={handle}
      style={{
        padding: "16px 20px",
        borderTop: "0.5px solid rgba(0,0,0,0.1)",
        background: "#fafbfc",
        display: "grid",
        gridTemplateColumns: "1.4fr 0.7fr 1.6fr auto",
        gap: "10px",
        alignItems: "end",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <label style={{
          fontSize: "10px", fontWeight: 600, color: "#1f6675",
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          {t("Feature")}
        </label>
        <select
          value={type}
          onChange={e => onTypeChange(e.target.value as RoomFeatureType)}
          style={{
            fontSize: "12px", padding: "8px 10px",
            borderRadius: "8px",
            border: "0.5px solid rgba(0,0,0,0.15)",
            background: "#fff", color: "#0e2638",
          }}
        >
          {ALL_ROOM_FEATURE_TYPES.map(ft => {
            const present = features.some(f => f.type === ft);
            return (
              <option key={ft} value={ft}>
                {t(getFeatureLabel(ft))}{present ? ` (${t("already added")})` : ""}
              </option>
            );
          })}
        </select>
      </div>

      <Input
        label={t("Qty")}
        type="number"
        min={1}
        value={quantity}
        onChange={e => setQuantity(Number(e.target.value) || 1)}
      />

      <Input
        label={t("Notes (optional)")}
        placeholder={t("e.g. 55-inch, facing courtyard")}
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />

      <GoldButton
        type="submit"
        size="sm"
        icon={<Plus size={12} />}
        loading={submitting}
      >
        {isUpdate ? t("Update") : t("Add")}
      </GoldButton>
    </form>
  );
}

function pickDefaultType(features: RoomFeature[]): RoomFeatureType {
  // Prefer the first type that the room *doesn't* yet have, so the form
  // opens ready to add something new rather than overwriting an existing row.
  const present = new Set(features.map(f => f.type));
  const next = ALL_ROOM_FEATURE_TYPES.find(ft => !present.has(ft));
  return next ?? "Tv";
}
