"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/layouts/Sidebar";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, initialized } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (initialized && !user) {
            router.replace("/login");
        }
    }, [initialized, user, router]);

    if (!initialized || !user) {
        return (
            <div className="min-h-screen bg-stone-200 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-stone-400" />
            </div>
        );
    }

    return (
        <div className="dashboard-shell">
            <Sidebar />
            <main className="dashboard-main">
                <div className="dashboard-content">
                    {children}
                </div>
            </main>
        </div>
    );
}