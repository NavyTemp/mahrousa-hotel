"use client";

import { useEffect, useMemo, useState } from "react";
import { roomsApi } from "@/lib/api";
import type { Room, RoomStatus } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/context/LanguageContext";
import { Search, Wrench, Sparkles, AlertTriangle, CheckCircle2, BedDouble } from "lucide-react";

type Filter = "All" | RoomStatus;

const FILTERS: Filter[] = ["All", "Dirty", "Maintenance", "Available", "Occupied"];

/* Status display order in the "All" view — operational priority first. */
const STATUS_ORDER: RoomStatus[] = ["Dirty", "Maintenance", "Available", "Occupied"];

const STATUS_COLOR: Record<RoomStatus, string> = {
    Available:   "#57a23f",
    Occupied:    "#2f78c7",
    Dirty:       "#c47a3b",
    Maintenance: "#c9423f",
};

/* Allowed transitions, with the action label and visual emphasis to show. */
type TransitionAction = {
    target: RoomStatus;
    label: string;
    primary?: boolean;
    icon?: React.ComponentType<{ size?: number }>;
};

const ACTIONS: Partial<Record<RoomStatus, TransitionAction[]>> = {
    Available: [
        { target: "Maintenance", label: "Issue", icon: AlertTriangle },
    ],
    Dirty: [
        { target: "Available",   label: "Clean", primary: true, icon: Sparkles },
        { target: "Maintenance", label: "Issue", icon: AlertTriangle },
    ],
    Maintenance: [
        { target: "Available", label: "Resolve", primary: true, icon: CheckCircle2 },
    ],
};

export default function RoomStatusPage() {
    const toast = useToast();
    const { t } = useI18n();
    const [rooms,    setRooms]    = useState<Room[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState("");
    const [filter,   setFilter]   = useState<Filter>("All");
    const [search,   setSearch]   = useState("");
    const [updating, setUpdating] = useState<Record<number, RoomStatus | null>>({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const data = await roomsApi.getAll();
                if (!cancelled) setRooms(data);
            } catch (e: unknown) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : t("Failed to load rooms."));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    async function transition(room: Room, target: RoomStatus) {
        setUpdating(p => ({ ...p, [room.id]: target }));
        try {
            await roomsApi.updateStatus(room.id, target);
            toast.success(t("Room {n} → {status}", { n: room.roomNumber, status: t(target) }));
            // Optimistic local update so the tile moves to its new section
            // immediately, without a full reload flash.
            setRooms(prev =>
                prev.map(r => (r.id === room.id ? { ...r, status: target } : r)),
            );
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t("Update failed."));
        } finally {
            setUpdating(p => ({ ...p, [room.id]: null }));
        }
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rooms.filter(r => {
            if (filter !== "All" && r.status !== filter) return false;
            if (!q) return true;
            return (
                r.roomNumber.toString().toLowerCase().includes(q) ||
                r.type.toLowerCase().includes(q)
            );
        });
    }, [rooms, filter, search]);

    /* Group filtered rooms by status, preserving operational priority order. */
    const groups = useMemo(() => {
        const byStatus: Record<RoomStatus, Room[]> = {
            Available: [], Occupied: [], Dirty: [], Maintenance: [],
        };
        for (const r of filtered) byStatus[r.status].push(r);
        for (const k of STATUS_ORDER) {
            byStatus[k].sort((a, b) =>
                a.roomNumber.toString().localeCompare(b.roomNumber.toString(), undefined, { numeric: true }),
            );
        }
        return STATUS_ORDER
            .map(s => ({ status: s, items: byStatus[s] }))
            .filter(g => g.items.length > 0);
    }, [filtered]);

    /* Total counts across all rooms (unfiltered) — for the filter chips. */
    const counts = useMemo(() => {
        const c: Record<Filter, number> = {
            All: rooms.length, Available: 0, Occupied: 0, Dirty: 0, Maintenance: 0,
        };
        for (const r of rooms) c[r.status]++;
        return c;
    }, [rooms]);

    return (
        <div>
            <PageHeader
                title={t("Room status")}
                subtitle={t("Manage cleaning and maintenance transitions")}
            />

            {loading && <Spinner />}

            {!loading && error && (
                <p style={{ fontSize: "13px", color: "#8e2424", textAlign: "center", padding: "40px 0" }}>
                    {error}
                </p>
            )}

            {!loading && !error && (
                <>
                    <div className="rs-toolbar">
                        <div className="rs-search">
                            <Search size={14} />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t("Search room number or type…")}
                                aria-label={t("Search rooms")}
                            />
                        </div>
                        <div className="filter-buttons" style={{ marginBottom: 0 }}>
                            {FILTERS.map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`filter-btn ${filter === f ? "active" : ""}`}
                                >
                                    {t(f)}
                                    <span className="rs-chip-count">{counts[f]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {groups.length === 0 ? (
                        <EmptyState
                            icon={<Wrench size={24} />}
                            title={t("No rooms match")}
                            description={
                                search
                                    ? t("No rooms match \"{q}\".", { q: search })
                                    : t("No rooms with status \"{status}\".", { status: t(filter) })
                            }
                        />
                    ) : (
                        groups.map(group => (
                            <section key={group.status} className="rs-section">
                                <div className="rs-section-title">
                                    <span
                                        className="rs-section-dot"
                                        style={{ background: STATUS_COLOR[group.status] }}
                                    />
                                    {t(group.status)}
                                    <span className="rs-section-count">{group.items.length}</span>
                                </div>
                                <div className="rs-grid">
                                    {group.items.map(room => (
                                        <RoomTile
                                            key={room.id}
                                            room={room}
                                            pendingTarget={updating[room.id] ?? null}
                                            onTransition={t => transition(room, t)}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))
                    )}
                </>
            )}
        </div>
    );
}

function RoomTile({
    room,
    pendingTarget,
    onTransition,
}: {
    room: Room;
    pendingTarget: RoomStatus | null;
    onTransition: (target: RoomStatus) => void;
}) {
    const { t } = useI18n();
    const actions = ACTIONS[room.status] ?? [];
    const isUpdating = pendingTarget !== null;

    return (
        <div className={`rs-tile ${room.status.toLowerCase()}`}>
            <div className="rs-tile-head">
                <div>
                    <div className="rs-tile-num">{room.roomNumber}</div>
                    <div className="rs-tile-type">{t(room.type)}</div>
                </div>
            </div>

            {actions.length === 0 ? (
                <div className="rs-tile-static">
                    <BedDouble size={11} />
                    {t(room.status)}
                </div>
            ) : (
                <div className="rs-tile-actions">
                    {actions.map(a => {
                        const Icon = a.icon;
                        const thisLoading = pendingTarget === a.target;
                        return (
                            <button
                                key={a.target}
                                className={a.primary ? "primary" : ""}
                                disabled={isUpdating}
                                onClick={() => onTransition(a.target)}
                                title={t("Set room {n} → {status}", { n: room.roomNumber, status: t(a.target) })}
                            >
                                {Icon && !thisLoading && <Icon size={12} />}
                                {thisLoading ? "…" : t(a.label)}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
