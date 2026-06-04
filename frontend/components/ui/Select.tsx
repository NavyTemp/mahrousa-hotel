import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
}

export const Select = forwardRef<HTMLSelectElement, Props>(
    ({ label, error, className = "", children, ...props }, ref) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {label && (
                <label style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#1f6675",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                }}>
                    {label}
                </label>
            )}
            <div style={{ position: "relative" }}>
                <select
                    ref={ref}
                    style={{
                        width: "100%",
                        paddingInlineStart: "0.95rem",
                        paddingInlineEnd: "2.4rem",
                        paddingTop: "11px",
                        paddingBottom: "11px",
                        fontSize: "13px",
                        background: "#15324a",
                        color: "#e6ecf0",
                        border: "1px solid rgba(31, 102, 117, 0.16)",
                        borderRadius: "10px",
                        outline: "none",
                        appearance: "none",
                        transition: "all 0.18s",
                        cursor: "pointer",
                    }}
                    className={[
                        "focus:border-[#1f6675] focus:ring-2 focus:ring-[#1f6675]/25",
                        "disabled:bg-[#0e2638] disabled:cursor-not-allowed disabled:text-[#465766]",
                        error ? "border-red-400/50 focus:ring-red-400/40 focus:border-red-400" : "",
                        className,
                    ].join(" ")}
                    {...props}
                >
                    {children}
                </select>
                <ChevronDown
                    size={14}
                    style={{
                        position: "absolute",
                        insetInlineEnd: "13px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#1f6675",
                        pointerEvents: "none",
                    }}
                />
            </div>
            {error && <p style={{ fontSize: "11px", color: "#c9423f" }}>{error}</p>}
        </div>
    )
);
Select.displayName = "Select";
