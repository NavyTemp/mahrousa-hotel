import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, Props>(
    ({ label, error, hint, icon, className = "", style, ...props }, ref) => (
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
                {icon && (
                    <span
                        style={{
                            position: "absolute",
                            insetInlineStart: "13px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            pointerEvents: "none",
                            display: "flex",
                            alignItems: "center",
                            color: "#7e8a94",
                        }}
                    >
                        {icon}
                    </span>
                )}
                <input
                    ref={ref}
                    style={{
                        width: "100%",
                        paddingInlineStart: icon ? "2.5rem" : "0.95rem",
                        paddingInlineEnd: "0.95rem",
                        paddingTop: "11px",
                        paddingBottom: "11px",
                        fontSize: "13px",
                        background: "#15324a",
                        color: "#e6ecf0",
                        border: "1px solid rgba(31, 102, 117, 0.16)",
                        borderRadius: "10px",
                        outline: "none",
                        transition: "all 0.18s",
                        ...style,
                    }}
                    className={[
                        "placeholder:text-[#7e8a94]",
                        "focus:border-[#1f6675] focus:ring-2 focus:ring-[#1f6675]/25",
                        "disabled:bg-[#0e2638] disabled:text-[#465766] disabled:cursor-not-allowed",
                        error ? "border-red-400/50 focus:ring-red-400/40 focus:border-red-400" : "",
                        className,
                    ].join(" ")}
                    {...props}
                />
            </div>
            {error && <p style={{ fontSize: "11px", color: "#c9423f" }}>{error}</p>}
            {hint && !error && <p style={{ fontSize: "11px", color: "#6f7c89" }}>{hint}</p>}
        </div>
    )
);
Input.displayName = "Input";
