import { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost" | "gold";
    size?: "sm" | "md";
    loading?: boolean;
    icon?: ReactNode;
}

const BASE: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    fontWeight: 600,
    borderRadius: "10px",
    transition: "all 0.18s ease",
    cursor: "pointer",
    outline: "none",
    userSelect: "none",
    border: "1px solid transparent",
    fontSize: "13px",
    letterSpacing: "0.01em",
};

const SIZES: Record<string, React.CSSProperties> = {
    sm: { padding: "6px 12px", fontSize: "11.5px" },
    md: { padding: "10px 20px", fontSize: "13px" },
};

const VARIANTS: Record<string, React.CSSProperties> = {
    primary: {
        background: "linear-gradient(135deg, #142a3f 0%, #0e2638 100%)",
        color: "#e6ecf0",
        borderColor: "#0e2638",
        boxShadow: "0 2px 8px rgba(14, 38, 56, 0.18)",
    },
    secondary: {
        background: "#ffffff",
        color: "#0e2638",
        borderColor: "rgba(14, 38, 56, 0.14)",
    },
    danger: {
        background: "linear-gradient(135deg, #c9423f 0%, #a83432 100%)",
        color: "#fff",
        borderColor: "#a83432",
        boxShadow: "0 2px 8px rgba(168, 52, 50, 0.22)",
    },
    ghost: {
        background: "transparent",
        color: "#465766",
        borderColor: "transparent",
    },
    gold: {
        background: "linear-gradient(135deg, #1f6675 0%, #155160 55%, #0e3a44 100%)",
        color: "#e6ecf0",
        borderColor: "#0e3a44",
        fontWeight: 600,
        boxShadow: "0 2px 12px rgba(31, 102, 117, 0.35)",
    },
};

export function Button({
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    children,
    className = "",
    disabled,
    style: propStyle,
    ...props
}: Props) {
    const mergedStyle: React.CSSProperties = {
        ...BASE,
        ...SIZES[size],
        ...VARIANTS[variant],
        ...(disabled || loading ? { opacity: 0.55, cursor: "not-allowed", boxShadow: "none" } : {}),
        ...propStyle,
    };

    return (
        <button
            disabled={disabled || loading}
            style={mergedStyle}
            className={className}
            {...props}
        >
            {loading
                ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                : icon}
            {children}
        </button>
    );
}

// Gold CTA button used for primary hotel actions
export function GoldButton(props: Omit<Props, "variant">) {
    return (
        <Button
            {...props}
            variant="gold"
        />
    );
}
