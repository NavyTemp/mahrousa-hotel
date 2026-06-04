"use client";

import {
    createContext, useContext, useState,
    useCallback, ReactNode,
} from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast { id: number; message: string; type: ToastType }

interface ToastCtx {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);
let n = 0;

const STYLES: Record<ToastType, { bar: string; icon: ReactNode }> = {
    success: {
        bar: "border-l-4 border-green-500",
        icon: <CheckCircle size={16} className="text-green-500 shrink-0" />,
    },
    error: {
        bar: "border-l-4 border-red-500",
        icon: <XCircle size={16} className="text-red-500 shrink-0" />,
    },
    info: {
        bar: "border-l-4 border-blue-500",
        icon: <Info size={16} className="text-blue-500 shrink-0" />,
    },
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const add = useCallback((message: string, type: ToastType) => {
        const id = ++n;
        setToasts(p => [...p, { id, message, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    }, []);

    const dismiss = useCallback((id: number) =>
        setToasts(p => p.filter(t => t.id !== id)), []);

    return (
        <Ctx.Provider value={{
            success: m => add(m, "success"),
            error: m => add(m, "error"),
            info: m => add(m, "info"),
        }}>
            {children}
            <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 min-w-72">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`
              flex items-start gap-3 bg-white px-4 py-3
              rounded-xl shadow-lg border border-stone-400/20
              ${STYLES[t.type].bar}
              animate-in slide-in-from-bottom-2 fade-in duration-200
            `}
                    >
                        {STYLES[t.type].icon}
                        <p className="text-sm text-stone-800 flex-1">{t.message}</p>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="text-stone-400 hover:text-stone-600 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </Ctx.Provider>
    );
}

export function useToast() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useToast must be used inside ToastProvider");
    return ctx;
}