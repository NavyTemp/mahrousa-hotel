"use client";

import { useEffect, useMemo, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { inventoryApi, roomsApi } from "@/lib/api";
import { getRoomFeatures, getRoomTypeBlurb } from "@/lib/roomFeatures";
import type { InventoryItem, InventoryCategory, Room } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardHeader } from "@/components/ui/Card";
import { RoomPicker } from "@/components/ui/RoomPicker";
import { Input } from "@/components/ui/Input";
import { GoldButton, Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/context/LanguageContext";
import {
  Package,
  CheckCircle2,
  Plus,
  Check,
  X,
  ClipboardList,
  ArrowRight,
  Search,
  ChevronDown,
  ChevronRight,
  Boxes,
  AlertTriangle,
  BedDouble,
  Sparkles,
} from "lucide-react";

const EMPTY = { roomId: "", itemId: "", quantity: "1" };

// Display labels + stable ordering for the category sections.
const CATEGORY_ORDER: InventoryCategory[] = [
  "SelfCare",
  "Linens",
  "Bathroom",
  "Beverages",
  "Cleaning",
];

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  SelfCare:  "Self care",
  Linens:    "Linens",
  Bathroom:  "Bathroom",
  Beverages: "Beverages",
  Cleaning:  "Cleaning",
};

function groupByCategory(items: InventoryItem[]) {
  const groups = new Map<InventoryCategory, InventoryItem[]>();
  for (const cat of CATEGORY_ORDER) groups.set(cat, []);
  for (const item of items) {
    const key = (CATEGORY_ORDER as string[]).includes(item.category)
      ? item.category
      : "SelfCare";
    groups.get(key as InventoryCategory)!.push(item);
  }
  return CATEGORY_ORDER
    .map(cat => ({ category: cat, items: groups.get(cat) ?? [] }))
    .filter(g => g.items.length > 0);
}

export default function InventoryPage() {
  const toast = useToast();
  const { t } = useI18n();

  const [items,        setItems]        = useState<InventoryItem[]>([]);
  const itemGroups = useMemo(() => groupByCategory(items), [items]);
  const [rooms,        setRooms]        = useState<Room[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [form,         setForm]         = useState(EMPTY);
  const [errors,       setErrors]       = useState<Partial<typeof EMPTY>>({});
  const [submitting,   setSubmitting]   = useState(false);

  // Search query for the "Current stock" table.
  const [stockSearch, setStockSearch] = useState("");

  // Collapsed category groups. A category in this set is collapsed.
  // Default: all expanded.
  const [collapsedCats, setCollapsedCats] = useState<Set<InventoryCategory>>(
    () => new Set(),
  );

  function toggleCategory(cat: InventoryCategory) {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // Per-row restock state. When `restockingId` matches an item, that row
  // shows an inline quantity input + confirm/cancel buttons.
  const [restockingId,  setRestockingId]  = useState<number | null>(null);
  const [restockQty,    setRestockQty]    = useState("1");
  const [restockBusy,   setRestockBusy]   = useState(false);

  // Filtered groups for the stock list. When a search query is present
  // we hide non-matching items and the category row (and ignore the
  // collapsed state so matches are always visible).
  const filteredStockGroups = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    if (!q) return itemGroups;
    return itemGroups
      .map(g => ({
        category: g.category,
        items: g.items.filter(i => i.name.toLowerCase().includes(q)),
      }))
      .filter(g => g.items.length > 0);
  }, [itemGroups, stockSearch]);

  const stockHasQuery = stockSearch.trim().length > 0;

  function openRestock(item: InventoryItem) {
    setRestockingId(item.id);
    setRestockQty("1");
  }

  function cancelRestock() {
    setRestockingId(null);
    setRestockQty("1");
  }

  async function confirmRestock(item: InventoryItem) {
    const qty = Number(restockQty);
    if (!Number.isFinite(qty) || qty < 1) {
      toast.error(t("Enter a quantity of at least 1."));
      return;
    }
    setRestockBusy(true);
    try {
      const updated = await inventoryApi.restock({
        itemId:   item.id,
        quantity: qty,
      });
      setItems(curr => curr.map(i => i.id === item.id ? (updated ?? i) : i));
      toast.success(t("+{qty} {name} added to stock.", { qty, name: item.name }));
      cancelRestock();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Failed to add stock."));
    } finally {
      setRestockBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [i, r] = await Promise.all([
        inventoryApi.getAll(),
        roomsApi.getAll(),
      ]);
      setItems(i);
      // Housekeeping logs usage against rooms they're servicing (Dirty)
      // or topping up for current guests (Occupied). Available/Maintenance
      // rooms shouldn't be charged inventory.
      setRooms(r.filter(r => r.status === "Occupied" || r.status === "Dirty"));
    } catch {
      toast.error(t("Failed to load inventory."));
    } finally {
      setLoading(false);
    }
  }

  function validate() {
    const e: Partial<typeof EMPTY> = {};
    if (!form.roomId)                         e.roomId   = t("Select a room.");
    if (!form.itemId)                         e.itemId   = t("Select an item.");
    if (!form.quantity || Number(form.quantity) < 1)
                                              e.quantity = t("Quantity must be at least 1.");
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await inventoryApi.use({
        roomId:   Number(form.roomId),
        itemId:   Number(form.itemId),
        quantity: Number(form.quantity),
      });
      const itemName = items.find(i => i.id === Number(form.itemId))?.name;
      toast.success(t("{qty}× {name} logged for room.", { qty: form.quantity, name: itemName ?? "" }));
      setForm(EMPTY);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Failed to log usage."));
    } finally {
      setSubmitting(false);
    }
  }

  // The currently selected item in the Log usage form, if any.
  const selectedItem = useMemo(
    () => items.find(i => String(i.id) === form.itemId) ?? null,
    [items, form.itemId],
  );

  // The currently selected room in the Log usage form, if any. Used to
  // surface the room's contents (beds, bath, TV, …) right below the picker.
  const selectedRoom = useMemo(
    () => rooms.find(r => String(r.id) === form.roomId) ?? null,
    [rooms, form.roomId],
  );

  // Total stock at a glance (shown in the header action).
  const totalStock = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );
  const lowStockCount = useMemo(
    () => items.filter(i => i.quantity <= 5).length,
    [items],
  );

  return (
    <div>
      <PageHeader
        title={t("Inventory")}
        subtitle={t("Track and log item usage per room")}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>

        {/* Stock list */}
        <div className="table-wrap">
          <CardHeader
            title={t("Current stock")}
            icon={<Package size={14} />}
            action={
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                fontSize: "11px", color: "#465766",
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  padding: "3px 8px", borderRadius: "999px",
                  background: "#e7f0f2", color: "#155160", fontWeight: 600,
                }}>
                  <Boxes size={11} />
                  {t("{n} units", { n: totalStock })}
                </span>
                {lowStockCount > 0 && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "3px 8px", borderRadius: "999px",
                    background: "#fdecec", color: "#b13c3b", fontWeight: 600,
                  }}>
                    <AlertTriangle size={11} />
                    {t("{n} low", { n: lowStockCount })}
                  </span>
                )}
              </div>
            }
          />

          {/* Stock search */}
          <div style={{
            padding: "10px 16px",
            borderBottom: "0.5px solid rgba(0,0,0,0.07)",
            background: "#fff",
          }}>
            <div style={{ position: "relative" }}>
              <Search
                size={13}
                style={{
                  position: "absolute",
                  insetInlineStart: "11px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#6f7c89",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder={t("Search items in stock…")}
                value={stockSearch}
                onChange={e => setStockSearch(e.target.value)}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "8px 32px 8px 32px",
                  fontSize: "12px",
                  background: "#fbf8f2",
                  border: "0.5px solid rgba(0,0,0,0.1)",
                  borderRadius: "8px",
                  color: "#222",
                  outline: "none",
                }}
              />
              {stockSearch && (
                <button
                  type="button"
                  aria-label={t("Clear search")}
                  onClick={() => setStockSearch("")}
                  style={{
                    position: "absolute",
                    insetInlineEnd: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    border: "none",
                    borderRadius: "4px",
                    color: "#6f7c89",
                    cursor: "pointer",
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "32px", display: "flex", justifyContent: "center" }}><Spinner /></div>
          ) : items.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#6f7c89", fontSize: "13px" }}>
              {t("No items in inventory")}
            </div>
          ) : filteredStockGroups.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#6f7c89", fontSize: "13px" }}>
              {t("No items match “{q}”.", { q: stockSearch })}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t("Item")}</th>
                  <th>{t("In stock")}</th>
                  <th style={{ textAlign: "right" }}>{t("Action")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredStockGroups.flatMap(group => {
                  // When the user types a query, show everything matching,
                  // even if the group was previously collapsed.
                  const isCollapsed = !stockHasQuery && collapsedCats.has(group.category);
                  return [
                    <tr key={`hdr-${group.category}`}>
                      <td
                        colSpan={3}
                        onClick={() => !stockHasQuery && toggleCategory(group.category)}
                        style={{
                          background: "#e7f0f2",
                          color: "#155160",
                          fontSize: "11px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          padding: "8px 12px",
                          cursor: stockHasQuery ? "default" : "pointer",
                          userSelect: "none",
                        }}
                      >
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}>
                          {!stockHasQuery && (
                            isCollapsed
                              ? <ChevronRight size={12} />
                              : <ChevronDown size={12} />
                          )}
                          <span>{t(CATEGORY_LABELS[group.category])}</span>
                          <span style={{
                            marginInlineStart: "auto",
                            fontSize: "10px",
                            color: "#a07a3a",
                            fontWeight: 600,
                            background: "rgba(21, 81, 96, 0.08)",
                            padding: "1px 7px",
                            borderRadius: "999px",
                          }}>
                            {group.items.length}
                          </span>
                        </div>
                      </td>
                    </tr>,
                    ...(isCollapsed ? [] : group.items.map(item => {
                      const isEditing = restockingId === item.id;
                      return (
                        <tr key={item.id}>
                          <td style={{ color: "#1f324a" }}>{item.name}</td>
                          <td>
                            <span style={{
                              fontWeight: 600,
                              color: item.quantity <= 5
                                ? "#c9423f"
                                : item.quantity <= 15
                                ? "#155160"
                                : "#0e2638",
                            }}>
                              {item.quantity}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {isEditing ? (
                            <div style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}>
                              <input
                                type="number"
                                min={1}
                                autoFocus
                                value={restockQty}
                                disabled={restockBusy}
                                onChange={e => setRestockQty(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") confirmRestock(item);
                                  if (e.key === "Escape") cancelRestock();
                                }}
                                style={{
                                  width: "64px",
                                  padding: "5px 8px",
                                  fontSize: "12px",
                                  border: "0.5px solid rgba(0,0,0,0.15)",
                                  borderRadius: "6px",
                                  outline: "none",
                                  textAlign: "right",
                                }}
                              />
                              <Button
                                variant="gold"
                                size="sm"
                                icon={<Check size={12} />}
                                loading={restockBusy}
                                onClick={() => confirmRestock(item)}
                              >
                                {t("Add")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<X size={12} />}
                                disabled={restockBusy}
                                onClick={cancelRestock}
                              >
                                {t("Cancel")}
                              </Button>
                            </div>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Plus size={12} />}
                                disabled={restockingId !== null}
                                onClick={() => openRestock(item)}
                              >
                                {t("Add stock")}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })),
                  ];
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Use items form */}
        <div style={{
          background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)",
          borderRadius: "12px", overflow: "hidden",
        }}>
          <CardHeader
            title={t("Log usage")}
            subtitle={t("Record items used in a room")}
            icon={<CheckCircle2 size={14} />}
          />
          <div style={{ padding: "18px" }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <RoomPicker
                rooms={rooms}
                value={form.roomId}
                error={errors.roomId}
                disabled={loading || rooms.length === 0}
                emptyText={loading ? t("Loading…") : t("No rooms to log against")}
                onChange={id => {
                  setForm(p => ({ ...p, roomId: id }));
                  setErrors(p => ({ ...p, roomId: "" }));
                }}
              />

              {selectedRoom && <RoomContentsPanel room={selectedRoom} />}

              <ItemPicker
                groups={itemGroups}
                value={form.itemId}
                error={errors.itemId}
                disabled={loading || items.length === 0}
                onChange={id => {
                  setForm(p => ({ ...p, itemId: id }));
                  setErrors(p => ({ ...p, itemId: "" }));
                }}
              />

              <Input
                label={t("Quantity")}
                type="number"
                min={1}
                value={form.quantity}
                error={errors.quantity}
                onChange={e => {
                  setForm(p => ({ ...p, quantity: e.target.value }));
                  setErrors(p => ({ ...p, quantity: "" }));
                }}
              />

              {selectedItem && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "#e7f0f2",
                  border: "0.5px solid rgba(21, 81, 96, 0.15)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}>
                  <span style={{ color: "#155160" }}>
                    <strong>{selectedItem.name}</strong>
                    <span style={{ color: "#a07a3a" }}>
                      {" "}— {t(CATEGORY_LABELS[selectedItem.category])}
                    </span>
                  </span>
                  <span style={{
                    color: selectedItem.quantity <= 5 ? "#c9423f" : "#155160",
                    fontWeight: 600,
                  }}>
                    {t("{n} in stock", { n: selectedItem.quantity })}
                  </span>
                </div>
              )}

              <GoldButton
                type="submit"
                loading={submitting}
                className="w-full mt-1"
              >
                {t("Log usage")}
              </GoldButton>
            </form>
          </div>
        </div>

      </div>

      {/* History entry point */}
      <Link
        href="/history"
        style={{
          marginTop: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          background: "#fff",
          border: "0.5px solid rgba(0,0,0,0.1)",
          borderRadius: "12px",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "28px", height: "28px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#e7f0f2", color: "#155160",
            borderRadius: "8px",
          }}>
            <ClipboardList size={14} />
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#222" }}>
              {t("View activity history")}
            </div>
            <div style={{ fontSize: "12px", color: "#777" }}>
              {t("Audit log of every usage and restock entry")}
            </div>
          </div>
        </div>
        <ArrowRight size={16} color="#6f7c89" />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Searchable item picker used in the Log usage form.                 */
/* ------------------------------------------------------------------ */

interface ItemPickerProps {
  groups: { category: InventoryCategory; items: InventoryItem[] }[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
  disabled?: boolean;
}

function ItemPicker({ groups, value, onChange, error, disabled }: ItemPickerProps) {
  const { t } = useI18n();
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const [pos,   setPos]   = useState<{ left: number; top: number; width: number; placeAbove: boolean } | null>(null);
  const rootRef    = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  // Maximum height the popover can take (matches the inner scroll cap).
  const MAX_POPOVER_HEIGHT = 320;

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

  // Recompute on open + while open (scroll/resize).
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

  const allItems = useMemo(
    () => groups.flatMap(g => g.items),
    [groups],
  );
  const selected = useMemo(
    () => allItems.find(i => String(i.id) === value) ?? null,
    [allItems, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map(g => ({
        category: g.category,
        items: g.items.filter(i => i.name.toLowerCase().includes(q)),
      }))
      .filter(g => g.items.length > 0);
  }, [groups, query]);

  // Close on outside click.
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

  // Focus the search field as soon as the dropdown opens.
  useEffect(() => {
    if (open) {
      const focusTimer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(focusTimer);
    }
  }, [open]);

  function pick(item: InventoryItem) {
    if (item.quantity === 0) return;
    onChange(String(item.id));
    setOpen(false);
    setQuery("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setQuery("");
  }

  return (
    <div ref={rootRef} style={{ display: "flex", flexDirection: "column", gap: "5px", position: "relative" }}>
      <label style={{
        fontSize: "10px",
        fontWeight: 600,
        color: "#1f6675",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}>
        {t("Item")}
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
          gap: "8px",
          paddingLeft: "0.875rem",
          paddingRight: "0.875rem",
          paddingTop: "10px",
          paddingBottom: "10px",
          fontSize: "13px",
          background: "#15324a",
          color: selected ? "#e6ecf0" : "#6f7c89",
          border: `0.5px solid ${error ? "rgba(201, 66, 63, 0.5)" : open ? "#1f6675" : "rgba(255,255,255,0.08)"}`,
          borderRadius: "8px",
          outline: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          textAlign: "left",
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected
            ? t("{name} ({n} left)", { name: selected.name, n: selected.quantity })
            : t("Search and select an item…")}
        </span>
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
              width: "18px",
              height: "18px",
              borderRadius: "4px",
              color: "#6f7c89",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            <X size={11} />
          </span>
        )}
        <ChevronDown
          size={14}
          style={{
            color: "#6f7c89",
            transition: "transform 0.15s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && pos && (
        <div
          style={{
            position: "fixed",
            left:  pos.left,
            top:   pos.placeAbove ? undefined : pos.top + 4,
            bottom: pos.placeAbove ? window.innerHeight - pos.top + 4 : undefined,
            width: pos.width,
            maxHeight: MAX_POPOVER_HEIGHT,
            zIndex: 1000,
            background: "#0f2a3f",
            border: "0.5px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search field */}
          <div style={{
            padding: "10px",
            borderBottom: "0.5px solid rgba(255,255,255,0.06)",
            position: "relative",
          }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                insetInlineStart: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6f7c89",
                pointerEvents: "none",
              }}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
              placeholder={t("Search items…")}
              style={{
                width: "100%",
                paddingBlock: "7px",
                paddingInlineStart: "30px",
                paddingInlineEnd: "10px",
                fontSize: "12px",
                background: "#15324a",
                color: "#e6ecf0",
                border: "0.5px solid rgba(255,255,255,0.08)",
                borderRadius: "7px",
                outline: "none",
              }}
            />
          </div>

          {/* Options list */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 0" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#6f7c89", fontSize: "12px" }}>
                {t("No items match “{q}”.", { q: query })}
              </div>
            ) : (
              filtered.map(group => (
                <div key={group.category}>
                  <div style={{
                    padding: "6px 12px",
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#1f6675",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    background: "rgba(255,255,255,0.02)",
                  }}>
                    {t(CATEGORY_LABELS[group.category])}
                  </div>
                  {group.items.map(item => {
                    const isSelected = String(item.id) === value;
                    const outOfStock = item.quantity === 0;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        disabled={outOfStock}
                        onClick={() => pick(item)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          fontSize: "12px",
                          background: isSelected ? "rgba(31, 102, 117, 0.12)" : "transparent",
                          color: outOfStock ? "#465766" : "#e6ecf0",
                          border: "none",
                          textAlign: "left",
                          cursor: outOfStock ? "not-allowed" : "pointer",
                        }}
                        onMouseEnter={e => {
                          if (!outOfStock && !isSelected) {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                          }
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                          {isSelected && <Check size={12} style={{ color: "#1f6675" }} />}
                          <span style={{ marginInlineStart: isSelected ? 0 : "20px" }}>{item.name}</span>
                        </span>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: outOfStock
                            ? "#c9423f"
                            : item.quantity <= 5
                            ? "#e9a04a"
                            : "#6f7c89",
                        }}>
                          {outOfStock ? t("out of stock") : t("{n} left", { n: item.quantity })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: "11px", color: "#c9423f" }}>{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Room contents panel — shows the amenities of the picked room      */
/*  so staff knows what's inside (e.g. 2 beds, TV, mini bar).          */
/* ------------------------------------------------------------------ */

function RoomContentsPanel({ room }: { room: Room }) {
  const { t } = useI18n();
  const features = getRoomFeatures(room.type);
  if (features.length === 0) return null;

  return (
    <div style={{
      border: "0.5px solid rgba(31,102,117,0.35)",
      background: "linear-gradient(180deg, #eef5f7 0%, #faf5e8 100%)",
      borderRadius: "10px",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        borderBottom: "0.5px solid rgba(31,102,117,0.25)",
        background: "rgba(255,255,255,0.55)",
      }}>
        <div style={{
          width: "26px",
          height: "26px",
          borderRadius: "7px",
          background: "#155160",
          color: "#eef5f7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <BedDouble size={13} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#0e2638", lineHeight: 1.2 }}>
            {t("Room {n} contents", { n: room.roomNumber })}
          </div>
          <div style={{ fontSize: "11px", color: "#155160", marginTop: "1px" }}>
            {t(room.type)} · {t(getRoomTypeBlurb(room.type))}
          </div>
        </div>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "3px 9px",
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#155160",
          background: "#fff",
          border: "0.5px solid rgba(31,102,117,0.4)",
          borderRadius: "999px",
        }}>
          <Sparkles size={10} />
          {t("{n} included", { n: features.length })}
        </span>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "6px",
        padding: "10px 12px",
      }}>
        {features.map((f, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 8px",
              background: "#fff",
              border: "0.5px solid rgba(31,102,117,0.25)",
              borderRadius: "7px",
              fontSize: "11.5px",
              color: "#0e2638",
              fontWeight: 500,
              minWidth: 0,
            }}
          >
            <span style={{
              width: "22px",
              height: "22px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              background: "#e7f0f2",
              color: "#155160",
              flexShrink: 0,
            }}>
              <f.icon size={12} />
            </span>
            <span style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {t(f.label)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
