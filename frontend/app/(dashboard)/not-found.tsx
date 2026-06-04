"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/context/LanguageContext";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center min-h-96 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-stone-200 flex items-center
        justify-center">
        <span className="text-2xl font-semibold text-stone-400">404</span>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-stone-700">{t("Page not found")}</p>
        <p className="text-xs text-stone-400 mt-1">
          {t("This page doesn't exist or you don't have access.")}
        </p>
      </div>
      <Link href="/">
        <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />}>
          {t("Go home")}
        </Button>
      </Link>
    </div>
  );
}
