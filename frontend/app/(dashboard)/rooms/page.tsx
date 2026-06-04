"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { roomsApi } from "@/lib/api";
import { egp } from "@/lib/money";
import { getRoomFeatures } from "@/lib/roomFeatures";
import type { Room, RoomStatus } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useI18n } from "@/context/LanguageContext";
import { Building2 } from "lucide-react";

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
  const [rooms,   setRooms]   = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [filter,  setFilter]  = useState<Filter>("All");

  useEffect(() => {
    roomsApi.getAll()
      .then(setRooms)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "All"
    ? rooms
    : rooms.filter(r => r.status === filter);

  const counts = {
    Available:   rooms.filter(r => r.status === "Available").length,
    Occupied:    rooms.filter(r => r.status === "Occupied").length,
    Dirty:       rooms.filter(r => r.status === "Dirty").length,
    Maintenance: rooms.filter(r => r.status === "Maintenance").length,
  };

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
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoomCard({ room }: { room: Room }) {
  const { t } = useI18n();
  const features = getRoomFeatures(room.type);
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
        <div className="room-card-features" title={features.map(f => t(f.label)).join(" • ")}>
          {visible.map((f, i) => (
            <span key={i} className="room-card-feature">
              <f.icon size={11} />
              {t(f.label)}
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
    </div>
  );
}
