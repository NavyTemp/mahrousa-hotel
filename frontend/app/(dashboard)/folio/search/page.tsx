"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { GoldButton } from "@/components/ui/Button";
import { useI18n } from "@/context/LanguageContext";
import { Receipt, Search } from "lucide-react";

export default function FolioSearchPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [roomNumber, setRoomNumber] = useState("");
  const [error,  setError]  = useState("");

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!roomNumber.trim()) {
      setError(t("Enter a valid room number."));
      return;
    }
    router.push(`/folio/${roomNumber}`);
  }

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title={t("Guest folio")}
        subtitle={t("Look up and manage guest bills")}
      />
      <div className="center-layout">
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <div style={{
            background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)",
            borderRadius: "12px", overflow: "hidden",
          }}>
            <div style={{
              padding: "32px",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: "18px",
            }}>
              <div style={{
                width: "52px", height: "52px", borderRadius: "14px",
                background: "#dfe9ec",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Receipt size={26} style={{ color: "#155160" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#0e2638" }}>
                  {t("Find a guest folio")}
                </p>
                <p style={{ fontSize: "12px", color: "#6f7c89", marginTop: "4px" }}>
                  {t("Enter the room number to view the bill")}
                </p>
              </div>
              <form
                onSubmit={handleSearch}
                style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}
              >
                <Input
                  label={t("Room Number")}
                  type="text"
                  placeholder={t("e.g. 101")}
                  value={roomNumber}
                  error={error}
                  icon={<Search size={14} />}
                  onChange={e => {
                    setRoomNumber(e.target.value);
                    setError("");
                  }}
                  autoFocus
                />
                <GoldButton type="submit" className="w-full" style={{ padding: "10px" }}>
                  {t("View folio")}
                </GoldButton>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
