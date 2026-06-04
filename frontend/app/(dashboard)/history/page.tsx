"use client";

import { useEffect, useState } from "react";
import { inventoryApi } from "@/lib/api";
import type { InventoryRestockLog, InventoryUsageLog } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardHeader } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/context/LanguageContext";
import { ClipboardList, History, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

type Tab = "usage" | "restock";

export default function HistoryPage() {
  const toast = useToast();
  const { t } = useI18n();

  const [tab,         setTab]         = useState<Tab>("usage");
  const [usageLogs,   setUsageLogs]   = useState<InventoryUsageLog[]>([]);
  const [restockLogs, setRestockLogs] = useState<InventoryRestockLog[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [uLogs, rLogs] = await Promise.all([
        inventoryApi.getUsageLogs(200),
        inventoryApi.getRestockLogs(200),
      ]);
      setUsageLogs(uLogs);
      setRestockLogs(rLogs);
    } catch {
      toast.error(t("Failed to load activity history."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("Activity history")}
        subtitle={t("Inventory usage and restock activity, newest first")}
      />

      {/* Tabs */}
      <div
        role="tablist"
        aria-label={t("Activity type")}
        style={{
          display: "inline-flex",
          background: "#fff",
          border: "0.5px solid rgba(0,0,0,0.1)",
          borderRadius: "10px",
          padding: "4px",
          marginBottom: "16px",
          gap: "2px",
        }}
      >
        <TabButton
          active={tab === "usage"}
          onClick={() => setTab("usage")}
          icon={<ArrowDownToLine size={13} />}
          label={t("Usage")}
          count={usageLogs.length}
        />
        <TabButton
          active={tab === "restock"}
          onClick={() => setTab("restock")}
          icon={<ArrowUpFromLine size={13} />}
          label={t("Restock")}
          count={restockLogs.length}
        />
      </div>

      {tab === "usage" ? (
        <div className="table-wrap">
          <CardHeader
            title={t("Usage history")}
            subtitle={t("Who took what, for which room, and when")}
            icon={<ClipboardList size={14} />}
          />
          {loading ? (
            <div style={{ padding: "32px", display: "flex", justifyContent: "center" }}>
              <Spinner />
            </div>
          ) : usageLogs.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#6f7c89", fontSize: "13px" }}>
              {t("No usage logged yet")}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t("When")}</th>
                  <th>{t("Item")}</th>
                  <th>{t("Room")}</th>
                  <th>{t("Taken by")}</th>
                  <th style={{ textAlign: "right" }}>{t("Quantity")}</th>
                </tr>
              </thead>
              <tbody>
                {usageLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ color: "#465766", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {new Date(log.usedAt).toLocaleString()}
                    </td>
                    <td style={{ color: "#1f324a" }}>{log.itemName}</td>
                    <td style={{ color: "#1f324a" }}>{t("Room {n}", { n: log.roomNumber })}</td>
                    <td style={{ color: "#1f324a" }}>{log.staffName}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "#8e2424" }}>
                      -{log.quantityUsed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <CardHeader
            title={t("Restock history")}
            subtitle={t("Who added stock, and when")}
            icon={<History size={14} />}
          />
          {loading ? (
            <div style={{ padding: "32px", display: "flex", justifyContent: "center" }}>
              <Spinner />
            </div>
          ) : restockLogs.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#6f7c89", fontSize: "13px" }}>
              {t("No restock activity yet")}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t("When")}</th>
                  <th>{t("Item")}</th>
                  <th>{t("Added by")}</th>
                  <th style={{ textAlign: "right" }}>{t("Quantity")}</th>
                </tr>
              </thead>
              <tbody>
                {restockLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ color: "#465766", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {new Date(log.addedAt).toLocaleString()}
                    </td>
                    <td style={{ color: "#1f324a" }}>{log.itemName}</td>
                    <td style={{ color: "#1f324a" }}>{log.staffName}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "#2f5d0f" }}>
                      +{log.quantityAdded}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active, onClick, icon, label, count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        fontSize: "12px",
        fontWeight: 600,
        border: "none",
        borderRadius: "7px",
        cursor: "pointer",
        background: active ? "#e7f0f2" : "transparent",
        color: active ? "#155160" : "#465766",
        transition: "background 0.12s ease",
      }}
    >
      {icon}
      {label}
      <span
        style={{
          fontSize: "10px",
          fontWeight: 600,
          padding: "1px 6px",
          borderRadius: "999px",
          background: active ? "rgba(21,81,96,0.12)" : "rgba(0,0,0,0.06)",
          color: active ? "#155160" : "#777",
        }}
      >
        {count}
      </span>
    </button>
  );
}
