"use client";

import {
  createContext, useContext, useState,
  useEffect, useCallback, ReactNode,
} from "react";
import { Lang, translate } from "@/lib/i18n";

type Dir = "ltr" | "rtl";

interface LanguageContextValue {
  lang: Lang;
  dir: Dir;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const KEY = "hotel_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  // SSR + first client render default to English to avoid hydration mismatch;
  // the saved preference is applied in an effect right after mount.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "ar" || saved === "en") setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // Keep <html lang/dir> in sync so the browser handles RTL natively.
  useEffect(() => {
    const dir: Dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(
    () => setLangState((prev) => {
      const next: Lang = prev === "en" ? "ar" : "en";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    }),
    [],
  );

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(lang, key, vars),
    [lang],
  );

  const dir: Dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider");
  return ctx;
}
