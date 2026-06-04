import { ReactNode } from "react";

interface Props {
    icon: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "56px 0",
            gap: "12px",
        }}>
            <div style={{
                padding: "16px",
                background: "#dfe9ec",
                borderRadius: "14px",
                color: "#155160",
                border: "1px solid rgba(31, 102, 117, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}>
                {icon}
            </div>
            <p style={{
                fontFamily: "var(--font-display)",
                fontSize: "15px",
                fontWeight: 600,
                color: "#0e2638",
            }}>
                {title}
            </p>
            {description && (
                <p style={{
                    fontSize: "12px", color: "#6f7c89",
                    textAlign: "center", maxWidth: "280px",
                    lineHeight: 1.55,
                }}>
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}
