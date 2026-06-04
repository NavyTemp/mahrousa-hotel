import { ReactNode } from "react";

interface Props {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: Props) {
    return (
        <div className="flex items-start justify-between mb-7">
            <div className="brand-underline">
                <h1 style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "26px",
                    fontWeight: 600,
                    color: "#0e2638",
                    marginBottom: "4px",
                    lineHeight: 1.2,
                    letterSpacing: "-0.018em",
                }}>
                    {title}
                </h1>
                {subtitle && (
                    <p style={{
                        fontSize: "12.5px",
                        color: "#155160",
                        letterSpacing: "0.02em",
                    }}>
                        {subtitle}
                    </p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
