"use client";

import {
    createContext, useContext, useState,
    useEffect, useCallback, ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { AuthUser, StaffRole } from "@/types";

interface AuthContextValue {
    user: AuthUser | null;
    initialized: boolean;
    login: (token: string, fullName: string, roles: StaffRole[], staffId: number) => void;
    logout: () => void;
    isRole: (...roles: StaffRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const KEY = "hotel_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [initialized, setInitialized] = useState(false);
    const router = useRouter();

    useEffect(() => {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                // Back-compat: older sessions stored `role` (string) instead of `roles[]`.
                const normalized: AuthUser = {
                    ...parsed,
                    roles: Array.isArray(parsed.roles)
                        ? parsed.roles
                        : parsed.role
                        ? [parsed.role]
                        : [],
                };
                setUser(normalized);
            }
        } catch {
            localStorage.removeItem(KEY);
        } finally {
            setInitialized(true);
        }
    }, []);

    const login = useCallback(
        (token: string, fullName: string, roles: StaffRole[], staffId: number) => {
            const u: AuthUser = { token, fullName, roles, staffId };
            localStorage.setItem(KEY, JSON.stringify(u));
            // Sync a slim cookie payload for the edge middleware (roles only).
            document.cookie = `hotel_auth=${encodeURIComponent(
                JSON.stringify({ roles })
            )}; path=/; max-age=${60 * 60 * 12}`;
            setUser(u);
        },
        []
    );

    const logout = useCallback(() => {
        localStorage.removeItem(KEY);
        document.cookie = "hotel_auth=; path=/; max-age=0";
        setUser(null);
        router.push("/login");
    }, [router]);

    const isRole = useCallback(
        (...roles: StaffRole[]) =>
            !!user && roles.some(r => user.roles.includes(r)),
        [user]
    );

    return (
        <AuthContext.Provider value={{ user, initialized, login, logout, isRole }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
