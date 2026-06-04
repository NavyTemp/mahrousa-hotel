import { useId } from "react";

interface LogoProps {
    /** Pixel size of the badge (square). Default 40. */
    size?: number;
    /** "badge" (anchor mark inside a teal-gradient rounded square) or "mark" (anchor only, transparent bg). */
    variant?: "badge" | "mark";
    /** Stroke color override (only applied to the anchor mark itself). */
    color?: string;
    className?: string;
}

/**
 * Fleet Club Mahrousa — house brand mark.
 * A refined nautical anchor with a north-star accent, framed in a teal
 * gradient badge. Rendered as inline SVG so it scales crisply at any
 * size and inherits theme colors.
 */
export function Logo({
    size = 40,
    variant = "badge",
    color,
    className = "",
}: LogoProps) {
    const stroke = color ?? "#e6ecf0"; // pearl on dark by default

    // Stable across SSR/CSR so the gradient id doesn't trigger a hydration
    // mismatch. Sanitized because React's useId() includes ":" which is
    // not a valid character inside an SVG url(#...) reference.
    const reactId = useId();
    const gid = `lg-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

    const anchor = (
        <g
            stroke={stroke}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        >
            {/* North-star accent */}
            <circle cx="32" cy="6" r="1.4" fill={stroke} stroke="none" />

            {/* Shackle ring */}
            <circle cx="32" cy="13" r="3.8" />

            {/* Shank */}
            <line x1="32" y1="17" x2="32" y2="54" />

            {/* Stock (horizontal crossbar) */}
            <line x1="22" y1="22" x2="42" y2="22" />

            {/* Crown arc (the curve at the bottom) */}
            <path d="M12 44 Q12 58 32 58 Q52 58 52 44" />

            {/* Left fluke + tip */}
            <line x1="12" y1="44" x2="6.5" y2="38.5" />
            <line x1="12" y1="44" x2="17" y2="48.5" />

            {/* Right fluke + tip */}
            <line x1="52" y1="44" x2="57.5" y2="38.5" />
            <line x1="52" y1="44" x2="47" y2="48.5" />
        </g>
    );

    if (variant === "mark") {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 64 64"
                width={size}
                height={size}
                aria-label="Fleet Club Mahrousa"
                role="img"
                className={className}
            >
                {anchor}
            </svg>
        );
    }

    // "badge" — anchor inside a teal-gradient rounded square. The gradient
    // id is derived from useId() above so multiple Logo instances stay
    // unique without diverging between server and client.
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            width={size}
            height={size}
            aria-label="Fleet Club Mahrousa"
            role="img"
            className={className}
        >
            <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%"   stopColor="#3d8896" />
                    <stop offset="55%"  stopColor="#1f6675" />
                    <stop offset="100%" stopColor="#0e3a44" />
                </linearGradient>
            </defs>

            {/* Badge body */}
            <rect
                x="1"
                y="1"
                width="62"
                height="62"
                rx="14"
                ry="14"
                fill={`url(#${gid})`}
                stroke="rgba(126, 200, 211, 0.42)"
                strokeWidth="1"
            />

            {/* Inner hairline (luxury frame) */}
            <rect
                x="5"
                y="5"
                width="54"
                height="54"
                rx="11"
                ry="11"
                fill="none"
                stroke="rgba(255, 255, 255, 0.16)"
                strokeWidth="1"
            />

            {/* Anchor */}
            {anchor}
        </svg>
    );
}

/**
 * Full lockup: badge + serif wordmark. Used on the login hero.
 */
export function LogoLockup({
    align = "center",
    showLine = true,
}: {
    align?: "center" | "start";
    showLine?: boolean;
}) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: align === "center" ? "center" : "flex-start",
                textAlign: align === "center" ? "center" : "left",
            }}
        >
            <Logo size={80} variant="badge" />
            {showLine && (
                <div
                    style={{
                        marginTop: 26,
                        width: 56,
                        height: 1,
                        background:
                            "linear-gradient(90deg, transparent, rgba(126,200,211,0.55), transparent)",
                    }}
                />
            )}
        </div>
    );
}
