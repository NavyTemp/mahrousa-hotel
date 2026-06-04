import { Loader2 } from "lucide-react";

export function Spinner({ text = "Loading..." }: { text?: string }) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 0",
            gap: "12px",
        }}>
            <Loader2
                size={26}
                style={{
                    animation: "spin 1s linear infinite",
                    color: "#1f6675",
                }}
            />
            <p style={{ fontSize: "12px", color: "#6f7c89", letterSpacing: "0.04em" }}>{text}</p>
        </div>
    );
}
