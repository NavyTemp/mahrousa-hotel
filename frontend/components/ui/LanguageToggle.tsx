"use client";

import { useI18n } from "@/context/LanguageContext";
import { LANGS, LANG_SHORT } from "@/lib/i18n";
import { Languages } from "lucide-react";

/**
 * Segmented EN / عربي switch. `variant` adapts the palette to the dark
 * sidebar or a light surface (e.g. the login screen).
 */
export function LanguageToggle({
  variant = "dark",
}: {
  variant?: "dark" | "light";
}) {
  const { lang, setLang, t } = useI18n();
  const dark = variant === "dark";

  const wrap: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
    padding: "3px",
    borderRadius: "999px",
    background: dark ? "rgba(126, 200, 211, 0.08)" : "rgba(14, 38, 56, 0.05)",
    border: dark
      ? "1px solid rgba(126, 200, 211, 0.16)"
      : "1px solid rgba(14, 38, 56, 0.1)",
  };

  return (
    <div role="group" aria-label={t("Language")} style={wrap}>
      <Languages
        size={13}
        style={{
          margin: "0 4px",
          color: dark ? "rgba(230,236,240,0.55)" : "#6f7c89",
          flexShrink: 0,
        }}
      />
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "3px 10px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 700,
              lineHeight: 1.4,
              transition: "all 0.15s ease",
              background: active
                ? dark
                  ? "rgba(126, 200, 211, 0.2)"
                  : "#15324a"
                : "transparent",
              color: active
                ? dark
                  ? "#bcd5da"
                  : "#fff"
                : dark
                ? "rgba(230,236,240,0.55)"
                : "#6f7c89",
            }}
          >
            {LANG_SHORT[l]}
          </button>
        );
      })}
    </div>
  );
}
