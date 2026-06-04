"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, Check, X, BedDouble, CircleDot } from "lucide-react";
import { useI18n } from "@/context/LanguageContext";
import type { Room, RoomStatus } from "@/types";

interface Props {
    rooms: Room[];
    value: string;
    onChange: (id: string) => void;
    error?: string;
    disabled?: boolean;
    /** Optional text shown when the list is empty. */
    emptyText?: string;
}

const STATUS_DOT: Record<RoomStatus, string> = {
    Available:   "#57a23f",
    Occupied:    "#2f78c7",
    Dirty:       "#c47a3b",
    Maintenance: "#c9423f",
};

const STATUS_LABEL: Record<RoomStatus, string> = {
    Available:   "Available",
    Occupied:    "Occupied",
    Dirty:       "Needs cleaning",
    Maintenance: "Maintenance",
};

export function RoomPicker({
    rooms,
    value,
    onChange,
    error,
    disabled,
    emptyText,
}: Props) {
    const { t } = useI18n();
    const [open,  setOpen]  = useState(false);
    const [query, setQuery] = useState("");
    const [pos,   setPos]   = useState<{ left: number; top: number; width: number; placeAbove: boolean } | null>(null);

    const rootRef    = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const inputRef   = useRef<HTMLInputElement>(null);

    const MAX_POPOVER_HEIGHT = 340;

    const selected = useMemo(
        () => rooms.find(r => String(r.id) === value) ?? null,
        [rooms, value],
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rooms;
        return rooms.filter(r =>
            r.roomNumber.toLowerCase().includes(q)
            || r.type.toLowerCase().includes(q)
            || r.status.toLowerCase().includes(q));
    }, [rooms, query]);

    function updatePosition() {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const placeAbove = spaceBelow < MAX_POPOVER_HEIGHT && spaceAbove > spaceBelow;
        setPos({
            left:  rect.left,
            top:   placeAbove ? rect.top : rect.bottom,
            width: rect.width,
            placeAbove,
        });
    }

    useEffect(() => {
        if (!open) return;
        updatePosition();
        const handler = () => updatePosition();
        window.addEventListener("scroll", handler, true);
        window.addEventListener("resize", handler);
        return () => {
            window.removeEventListener("scroll", handler, true);
            window.removeEventListener("resize", handler);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        function onDown(e: MouseEvent) {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    useEffect(() => {
        if (open) {
            const focusTimer = setTimeout(() => inputRef.current?.focus(), 0);
            return () => clearTimeout(focusTimer);
        }
    }, [open]);

    function pick(room: Room) {
        onChange(String(room.id));
        setOpen(false);
        setQuery("");
    }

    function clear(e: React.MouseEvent) {
        e.stopPropagation();
        onChange("");
        setQuery("");
    }

    return (
        <div ref={rootRef} style={{ display: "flex", flexDirection: "column", gap: "6px", position: "relative" }}>
            <label style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#1f6675",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
            }}>
                {t("Room")}
            </label>

            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen(o => !o)}
                style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    paddingLeft: "0.95rem",
                    paddingRight: "0.95rem",
                    paddingTop: "11px",
                    paddingBottom: "11px",
                    fontSize: "13px",
                    background: "#15324a",
                    color: selected ? "#e6ecf0" : "#7e8a94",
                    border: `1px solid ${error ? "rgba(201, 66, 63, 0.5)" : open ? "#1f6675" : "rgba(31, 102, 117, 0.16)"}`,
                    borderRadius: "10px",
                    outline: "none",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.6 : 1,
                    textAlign: "left",
                    transition: "all 0.18s",
                    boxShadow: open ? "0 0 0 3px rgba(31, 102, 117, 0.18)" : "none",
                }}
            >
                {selected ? (
                    <>
                        <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "28px",
                            borderRadius: "8px",
                            background: "rgba(31, 102, 117, 0.22)",
                            color: "#7ec8d3",
                            flexShrink: 0,
                        }}>
                            <BedDouble size={13} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: "13px", fontWeight: 600, lineHeight: 1.1 }}>
                                {t("Room {n}", { n: selected.roomNumber })}
                            </span>
                            <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "11px",
                                color: "#a8b1ba",
                                marginTop: "3px",
                            }}>
                                {t(selected.type)}
                                <span style={{ color: "#465766" }}>·</span>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{
                                        width: "6px",
                                        height: "6px",
                                        borderRadius: "50%",
                                        background: STATUS_DOT[selected.status],
                                    }} />
                                    {t(STATUS_LABEL[selected.status])}
                                </span>
                            </span>
                        </span>
                    </>
                ) : (
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {disabled
                            ? (emptyText ?? t("No rooms available"))
                            : t("Select a room…")}
                    </span>
                )}

                {selected && !disabled && (
                    <span
                        role="button"
                        tabIndex={-1}
                        onClick={clear}
                        aria-label={t("Clear selection")}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "22px",
                            height: "22px",
                            borderRadius: "5px",
                            color: "#a8b1ba",
                            background: "rgba(255,255,255,0.06)",
                            flexShrink: 0,
                        }}
                    >
                        <X size={12} />
                    </span>
                )}
                <ChevronDown
                    size={14}
                    style={{
                        color: "#1f6675",
                        transition: "transform 0.18s",
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                        flexShrink: 0,
                    }}
                />
            </button>

            {open && pos && (
                <div
                    style={{
                        position: "fixed",
                        left:  pos.left,
                        top:   pos.placeAbove ? undefined : pos.top + 6,
                        bottom: pos.placeAbove ? window.innerHeight - pos.top + 6 : undefined,
                        width: pos.width,
                        maxHeight: MAX_POPOVER_HEIGHT,
                        zIndex: 1000,
                        background: "#0f2a3f",
                        border: "1px solid rgba(31, 102, 117, 0.22)",
                        borderRadius: "12px",
                        boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <div style={{
                        padding: "12px",
                        borderBottom: "1px solid rgba(31, 102, 117, 0.14)",
                        position: "relative",
                    }}>
                        <Search
                            size={13}
                            style={{
                                position: "absolute",
                                insetInlineStart: "22px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#7e8a94",
                                pointerEvents: "none",
                            }}
                        />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
                            placeholder={t("Search by number, type, or status…")}
                            style={{
                                width: "100%",
                                paddingBlock: "8px",
                                paddingInlineStart: "32px",
                                paddingInlineEnd: "10px",
                                fontSize: "12px",
                                background: "#15324a",
                                color: "#e6ecf0",
                                border: "1px solid rgba(31, 102, 117, 0.16)",
                                borderRadius: "8px",
                                outline: "none",
                            }}
                        />
                    </div>

                    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 0" }}>
                        {filtered.length === 0 ? (
                            <div style={{ padding: "22px", textAlign: "center", color: "#7e8a94", fontSize: "12px" }}>
                                {query.trim()
                                    ? t("No rooms match \"{q}\".", { q: query })
                                    : (emptyText ?? t("No rooms available."))}
                            </div>
                        ) : (
                            filtered.map(r => {
                                const isSelected = String(r.id) === value;
                                return (
                                    <button
                                        type="button"
                                        key={r.id}
                                        onClick={() => pick(r)}
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px",
                                            padding: "10px 14px",
                                            fontSize: "12px",
                                            background: isSelected ? "rgba(31, 102, 117, 0.14)" : "transparent",
                                            color: "#e6ecf0",
                                            border: "none",
                                            textAlign: "left",
                                            cursor: "pointer",
                                            transition: "background 0.15s",
                                        }}
                                        onMouseEnter={e => {
                                            if (!isSelected) {
                                                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isSelected) {
                                                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                                            }
                                        }}
                                    >
                                        {isSelected
                                            ? <Check size={12} style={{ color: "#7ec8d3", flexShrink: 0 }} />
                                            : <span style={{ width: 12, flexShrink: 0 }} />}
                                        <span style={{ flex: 1, minWidth: 0 }}>
                                            <span style={{ display: "block", fontSize: "12.5px", fontWeight: 600, lineHeight: 1.2 }}>
                                                {t("Room {n}", { n: r.roomNumber })}
                                            </span>
                                            <span style={{ display: "block", fontSize: "11px", color: "#a8b1ba", marginTop: "2px" }}>
                                                {t(r.type)}
                                            </span>
                                        </span>
                                        <span style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "5px",
                                            padding: "3px 9px",
                                            fontSize: "10px",
                                            fontWeight: 700,
                                            borderRadius: "999px",
                                            background: `${STATUS_DOT[r.status]}26`,
                                            color: STATUS_DOT[r.status],
                                            flexShrink: 0,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.04em",
                                        }}>
                                            <CircleDot size={10} />
                                            {t(STATUS_LABEL[r.status])}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {error && <p style={{ fontSize: "11px", color: "#c9423f" }}>{error}</p>}
        </div>
    );
}
