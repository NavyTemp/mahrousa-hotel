"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { folioApi } from "@/lib/api";
import { egp } from "@/lib/money";
import type { Folio, FolioLine } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { GoldButton, Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/context/LanguageContext";
import {
  Receipt, ArrowLeft, CheckCircle2,
  Calendar, Phone, BedDouble, Moon, Wallet,
  Printer, UtensilsCrossed, Sparkles, Lock,
  Upload, ImageIcon, X, FileCheck2,
} from "lucide-react";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

const money = egp;

export default function FolioPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const toast = useToast();
  const { t } = useI18n();

  const [folio,   setFolio]   = useState<Folio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [paying,  setPaying]  = useState(false);

  // Payment-proof upload state. We track the in-flight object URL via a
  // ref so we can revoke it cleanly on replace/clear/unmount without
  // calling setState inside an effect.
  const [proofFile,    setProofFile]    = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const proofUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    folioApi.getByRoom(roomId!)
      .then(setFolio)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [roomId]);

  // Revoke any pending object URL when the page unmounts.
  useEffect(() => {
    return () => {
      if (proofUrlRef.current) URL.revokeObjectURL(proofUrlRef.current);
    };
  }, []);

  function handleProofPick(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("Please choose an image file (JPG, PNG, etc.)."));
      return;
    }
    if (proofUrlRef.current) URL.revokeObjectURL(proofUrlRef.current);
    const url = URL.createObjectURL(file);
    proofUrlRef.current = url;
    setProofPreview(url);
    setProofFile(file);
  }

  function handleProofClear() {
    if (proofUrlRef.current) {
      URL.revokeObjectURL(proofUrlRef.current);
      proofUrlRef.current = null;
    }
    setProofPreview(null);
    setProofFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleConfirmPayment() {
    if (!folio) return;
    if (!proofFile) {
      toast.error(t("Upload a payment-proof image first."));
      return;
    }
    setPaying(true);
    try {
      const res = await folioApi.confirmPayment(folio.id, proofFile);
      setFolio(f => f ? {
        ...f,
        isPaid: true,
        paymentProofPath: res?.proofPath ?? f.paymentProofPath,
      } : f);
      toast.success(t("Payment confirmed. Guest checked out."));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Payment failed."));
    } finally {
      setPaying(false);
    }
  }

  function handleExportPdf() {
    window.print();
  }

  const roomLines       = folio?.lines.filter(l => l.lineType === "RoomCharge")       ?? [];
  const restaurantLines = folio?.lines.filter(l => l.lineType === "RestaurantCharge") ?? [];
  const otherLines      = folio?.lines.filter(l => l.lineType === "Other")            ?? [];

  const sum = (lines: FolioLine[]) => lines.reduce((acc, l) => acc + l.amount, 0);

  const roomSubtotal       = sum(roomLines);
  const restaurantSubtotal = sum(restaurantLines);
  const otherSubtotal      = sum(otherLines);

  return (
    <div>
      {/* ── Toolbar (screen only) ────────────────────────────────────── */}
      <div className="folio-toolbar no-print">
        <Link href="/folio/search">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
            {t("Back to search")}
          </Button>
        </Link>

        <div className="folio-toolbar-spacer" />

        <div className="folio-toolbar-title">
          <Receipt size={14} style={{ color: "#155160" }} />
          <span>{t("Folio · Room")} <strong>#{roomId}</strong></span>
        </div>

        {folio && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Printer size={14} />}
            onClick={handleExportPdf}
          >
            {t("Print / PDF")}
          </Button>
        )}
      </div>

      {loading && (
        <div className="folio-loading">
          <Spinner />
        </div>
      )}

      {!loading && error && (
        <div className="folio-empty">
          <div className="folio-empty-icon">
            <Receipt size={26} />
          </div>
          <div className="folio-empty-title">
            {t("No active folio for room {n}", { n: roomId })}
          </div>
          <div className="folio-empty-sub">{error}</div>
          <Link href="/folio/search">
            <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />}>
              {t("Search another room")}
            </Button>
          </Link>
        </div>
      )}

      {!loading && !error && folio && (
        <div className="folio-doc">

          {/* Print-only formal header */}
          <div className="folio-print-header">
            <div>
              <div className="brand">MAHROUSA</div>
              <div className="brand-sub">{t("Hotel Management System")}</div>
            </div>
            <div className="doc-id">
              <strong>{t("FOLIO #{n}", { n: folio.id })}</strong>
              <div>{t("Issued {d}", { d: fmt(folio.createdAt) })}</div>
              <div>{t("Reservation #{n}", { n: folio.reservationId })}</div>
            </div>
          </div>

          {/* ── Hero band ─────────────────────────────────────────────── */}
          <div className="folio-hero">
            <div className="folio-hero-left">
              <div className="folio-hero-eyebrow">
                <Receipt size={11} />
                {t("Folio")} · #{folio.id}
              </div>
              <div className="folio-hero-title">{folio.guestName}</div>
              <div className="folio-hero-meta">
                <span className="folio-hero-meta-item">
                  <Phone size={11} /> {folio.guestPhone}
                </span>
                <span className="folio-hero-meta-sep">·</span>
                <span className="folio-hero-meta-item">
                  {t("Reservation #{n}", { n: folio.reservationId })}
                </span>
                <span className="folio-hero-meta-sep">·</span>
                <span className="folio-hero-meta-item">
                  {t("Opened {d}", { d: fmt(folio.createdAt) })}
                </span>
              </div>
            </div>

            <div className="folio-hero-right">
              <Badge
                label={folio.isPaid ? t("Paid") : t("Open")}
                variant={folio.isPaid ? "available" : "pending"}
              />
              <div className="folio-hero-issued">
                <strong>{folio.lines.length}</strong>{" "}
                {folio.lines.length !== 1 ? t("lines") : t("line")}
                <br />
                {folio.nights !== 1
                  ? t("{n} nights stay", { n: folio.nights })
                  : t("{n} night stay", { n: folio.nights })}
              </div>
            </div>
          </div>

          {/* ── Stat strip ────────────────────────────────────────────── */}
          <div className="folio-stat-strip">
            <Stat
              icon={<Calendar size={16} />}
              label={t("Stay")}
              value={`${fmt(folio.checkInDate)} → ${fmt(folio.checkOutDate)}`}
              sub={folio.nights !== 1
                ? t("{n} nights", { n: folio.nights })
                : t("{n} night", { n: folio.nights })}
            />
            <Stat
              icon={<BedDouble size={16} />}
              label={t("Room")}
              value={`#${folio.roomNumber}`}
              sub={t(folio.roomType)}
            />
            <Stat
              icon={<Moon size={16} />}
              label={t("Rate")}
              value={money(folio.pricePerNight)}
              sub={t("per night")}
            />
            <Stat
              icon={<Wallet size={16} />}
              label={t("Total due")}
              value={money(folio.total)}
              valueSize="big"
              sub={folio.isPaid ? t("Settled in full") : t("Awaiting payment")}
            />
          </div>

          {/* ── Charges (grouped) ─────────────────────────────────────── */}
          <div className="folio-charges">
            {roomLines.length > 0 && (
              <ChargeGroup
                icon={<BedDouble size={13} />}
                title={t("Room charges")}
                lines={roomLines}
                subtotal={roomSubtotal}
              />
            )}
            {restaurantLines.length > 0 && (
              <ChargeGroup
                icon={<UtensilsCrossed size={13} />}
                title={t("Restaurant")}
                lines={restaurantLines}
                subtotal={restaurantSubtotal}
                accent="amber"
              />
            )}
            {otherLines.length > 0 && (
              <ChargeGroup
                icon={<Sparkles size={13} />}
                title={t("Other charges")}
                lines={otherLines}
                subtotal={otherSubtotal}
              />
            )}

            {folio.lines.length === 0 && (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "#6f7c89",
                  fontSize: "12px",
                  border: "0.5px dashed rgba(0,0,0,0.12)",
                  borderRadius: "10px",
                }}
              >
                {t("No charges have been posted to this folio yet.")}
              </div>
            )}
          </div>

          {/* ── Totals ────────────────────────────────────────────────── */}
          <div className="folio-totals">
            <div className="folio-totals-row">
              <span>{t("Room")} ({folio.nights} × {money(folio.pricePerNight)})</span>
              <span>{money(roomSubtotal)}</span>
            </div>
            {restaurantLines.length > 0 && (
              <div className="folio-totals-row">
                <span>
                  {t("Restaurant")} ({restaurantLines.length}{" "}
                  {restaurantLines.length !== 1 ? t("items") : t("item")})
                </span>
                <span>{money(restaurantSubtotal)}</span>
              </div>
            )}
            {otherLines.length > 0 && (
              <div className="folio-totals-row">
                <span>{t("Other")} ({otherLines.length})</span>
                <span>{money(otherSubtotal)}</span>
              </div>
            )}
            <div className="folio-totals-row grand">
              <span>{t("Total due")}</span>
              <span>{money(folio.total)}</span>
            </div>
          </div>

          {/* ── Payment proof upload (screen only, unpaid only) ───────── */}
          {!folio.isPaid && (
            <div className="folio-proof no-print">
              <div className="folio-proof-head">
                <div className="folio-proof-title">
                  <ImageIcon size={13} />
                  {t("Payment proof")}
                  <span className="folio-proof-required">{t("required")}</span>
                </div>
                <div className="folio-proof-sub">
                  {t("Attach a photo of the receipt / transfer screenshot before confirming payment.")}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => handleProofPick(e.target.files?.[0] ?? null)}
              />

              {!proofFile ? (
                <button
                  type="button"
                  className="folio-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("hover"); }}
                  onDragLeave={e => e.currentTarget.classList.remove("hover")}
                  onDrop={e => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("hover");
                    handleProofPick(e.dataTransfer.files?.[0] ?? null);
                  }}
                >
                  <div className="folio-dropzone-icon">
                    <Upload size={20} />
                  </div>
                  <div className="folio-dropzone-title">
                    {t("Drop an image here or click to choose")}
                  </div>
                  <div className="folio-dropzone-sub">
                    {t("JPG or PNG · up to 15 MB")}
                  </div>
                </button>
              ) : (
                <div className="folio-proof-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proofPreview ?? ""}
                    alt={proofFile.name}
                    className="folio-proof-thumb"
                  />
                  <div className="folio-proof-meta">
                    <div className="folio-proof-filename">
                      <FileCheck2 size={13} style={{ color: "#2f5d0f" }} />
                      {proofFile.name}
                    </div>
                    <div className="folio-proof-size">
                      {t("{n} KB · ready to upload", { n: (proofFile.size / 1024).toFixed(0) })}
                    </div>
                    <div className="folio-proof-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Upload size={12} />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {t("Replace")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<X size={12} />}
                        onClick={handleProofClear}
                      >
                        {t("Remove")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Action bar (screen only) ──────────────────────────────── */}
          <div className="folio-action-bar no-print">
            <div className="folio-action-note">
              {folio.isPaid ? (
                <>
                  <FileCheck2 size={12} style={{ color: "#2f5d0f" }} />
                  {folio.paymentProofPath
                    ? t("Folio is closed. Payment proof on file.")
                    : t("Folio is closed and read-only.")}
                </>
              ) : (
                <>
                  <Lock size={12} />
                  {proofFile
                    ? t("Proof attached — confirming will check the guest out.")
                    : t("Upload a payment-proof photo to enable confirmation.")}
                </>
              )}
            </div>

            {folio.isPaid ? (
              <div className="folio-paid-pill">
                <CheckCircle2 size={18} style={{ color: "#2f5d0f" }} />
                <div>
                  <div className="folio-paid-pill-text">{t("Paid & checked out")}</div>
                  <div className="folio-paid-pill-sub">
                    {folio.paymentProofPath ? t("Proof on file") : t("Payment confirmed")}
                  </div>
                </div>
              </div>
            ) : (
              <GoldButton
                loading={paying}
                disabled={!proofFile}
                onClick={handleConfirmPayment}
                icon={<CheckCircle2 size={15} />}
                style={{ padding: "10px 22px", fontSize: "13px" }}
              >
                {t("Confirm payment · {amount}", { amount: money(folio.total) })}
              </GoldButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function Stat({
  icon, label, value, sub, valueSize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueSize?: "big";
}) {
  return (
    <div className="folio-stat">
      <div className="folio-stat-icon">{icon}</div>
      <div className="folio-stat-body">
        <div className="folio-stat-label">{label}</div>
        <div className={"folio-stat-value" + (valueSize === "big" ? " big" : "")}>
          {value}
        </div>
        {sub && <div className="folio-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function ChargeGroup({
  icon, title, lines, subtotal, accent,
}: {
  icon: React.ReactNode;
  title: string;
  lines: FolioLine[];
  subtotal: number;
  accent?: "amber";
}) {
  const { t } = useI18n();
  return (
    <div className={"folio-group" + (accent === "amber" ? " amber" : "")}>
      <div className="folio-group-head">
        <div className="folio-group-icon">{icon}</div>
        <div className="folio-group-title">{title}</div>
        <div className="folio-group-count">
          · {lines.length} {lines.length !== 1 ? t("items") : t("item")}
        </div>
        <div className="folio-group-subtotal">{money(subtotal)}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>{t("Description")}</th>
            <th>{t("Date & time")}</th>
            <th style={{ textAlign: "right" }}>{t("Amount")}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(line => (
            <tr key={line.id}>
              <td className="folio-line-desc">{line.description}</td>
              <td className="folio-line-date">{fmtTime(line.createdAt)}</td>
              <td className="folio-line-amt">{money(line.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
