import { ReactNode } from "react";

interface CardProps {
    children: ReactNode;
    className?: string;
}

export function Card({ children, className = "" }: CardProps) {
    return (
        <div className={`card ${className}`}
            style={{
                background: "#fff",
                border: "1px solid rgba(14, 38, 56, 0.08)",
                borderRadius: "14px",
                overflow: "hidden",
                boxShadow: "0 1px 2px rgba(14, 38, 56, 0.03), 0 8px 24px rgba(14, 38, 56, 0.03)",
            }}
        >
            {children}
        </div>
    );
}

export function CardHeader({
    title,
    subtitle,
    action,
    icon,
}: {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    icon?: ReactNode;
}) {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(14, 38, 56, 0.07)",
            background: "linear-gradient(180deg, #fbf8f2 0%, #f7f1e3 100%)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {icon && (
                    <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "9px",
                        background: "#dfe9ec",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "13px",
                        color: "#155160",
                        border: "1px solid rgba(31, 102, 117, 0.25)",
                    }}>
                        {icon}
                    </div>
                )}
                <div>
                    <h2 style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "14.5px",
                        fontWeight: 600,
                        color: "#0e2638",
                        letterSpacing: "-0.005em",
                    }}>
                        {title}
                    </h2>
                    {subtitle && (
                        <p style={{
                            fontSize: "11.5px",
                            color: "#6f7c89",
                            marginTop: "2px",
                        }}>
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {action}
        </div>
    );
}

export function StatCard({
    label,
    value,
    sub,
    icon,
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: ReactNode;
    iconBg?: string;
    iconColor?: string;
}) {
    return (
        <div className="stat-card">
            <div className="stat-head">
                <p className="stat-label">{label}</p>
                <div className="stat-icon" style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    fontSize: "13px",
                }}>
                    {icon}
                </div>
            </div>
            <p className="stat-val">{value}</p>
            {sub && <p className="stat-sub">{sub}</p>}
        </div>
    );
}
