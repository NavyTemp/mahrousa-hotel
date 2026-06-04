"use client";

import { useState, FormEvent } from "react";
import { restaurantApi } from "@/lib/api";
import { egp } from "@/lib/money";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { GoldButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/context/LanguageContext";
import { UtensilsCrossed } from "lucide-react";

const EMPTY = { roomNumber: "", description: "", amount: "" };

export default function ChargePage() {
  const toast = useToast();
  const { t } = useI18n();

  const [form,       setForm]       = useState(EMPTY);
  const [errors,     setErrors]     = useState<Partial<typeof EMPTY>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const e: Partial<typeof EMPTY> = {};
    if (!form.roomNumber.trim())
      e.roomNumber = t("Enter a valid room number.");
    if (!form.description.trim())
      e.description = t("Description is required.");
    if (!form.amount || Number(form.amount) <= 0)
      e.amount = t("Amount must be greater than 0.");
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await restaurantApi.addCharge({
        roomNumber:  form.roomNumber,
        description: form.description,
        amount:      Number(form.amount),
      });
      toast.success(t("{amount} charged to room #{room}.", { amount: egp(Number(form.amount)), room: form.roomNumber }));
      setForm(EMPTY);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Charge failed."));
    } finally {
      setSubmitting(false);
    }
  }

  function field(key: keyof typeof EMPTY, value: string) {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(p => ({ ...p, [key]: "" }));
  }

  return (
    <div>
      <PageHeader
        title={t("Restaurant")}
        subtitle={t("Add food and beverage charges to a guest folio")}
      />

      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        <div style={{
          background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)",
          borderRadius: "12px", overflow: "hidden",
        }}>
          <CardHeader
            title={t("Add charge")}
            icon={<UtensilsCrossed size={14} />}
          />
          <div style={{ padding: "18px" }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Input
                label={t("Room Number")}
                type="text"
                placeholder={t("e.g. 101")}
                value={form.roomNumber}
                error={errors.roomNumber}
                onChange={e => field("roomNumber", e.target.value)}
              />
              <Input
                label={t("Description")}
                placeholder={t("e.g. Dinner for 2")}
                value={form.description}
                error={errors.description}
                onChange={e => field("description", e.target.value)}
              />
              <Input
                label={t("Amount (EGP)")}
                type="number"
                placeholder="0.00"
                min={0.01}
                step={0.01}
                value={form.amount}
                error={errors.amount}
                onChange={e => field("amount", e.target.value)}
              />

              {/* Preview */}
              {form.roomNumber && form.description && form.amount && (
                <div style={{
                  background: "#dfe9ec", border: "0.5px solid #7ec8d3",
                  borderRadius: "8px", padding: "10px 14px",
                }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "#155160", marginBottom: "4px" }}>
                    {t("Charge preview")}
                  </div>
                  <div style={{ fontSize: "12px", color: "#1f324a" }}>
                    <strong>{egp(Number(form.amount))}</strong> — {form.description}
                  </div>
                  <div style={{ fontSize: "10px", color: "#6f7c89", marginTop: "2px" }}>
                    {t("→ Room #{room}", { room: form.roomNumber })}
                  </div>
                </div>
              )}

              <GoldButton
                type="submit"
                loading={submitting}
                className="w-full"
              >
                {t("Add to folio")}
              </GoldButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
