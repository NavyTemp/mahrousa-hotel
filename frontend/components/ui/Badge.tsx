type Variant =
    | "available" | "occupied" | "dirty" | "maintenance"
    | "pending" | "checkedin" | "checkedout" | "cancelled"
    | "phone" | "walkin"
    | "roomcharge" | "restaurantcharge" | "other"
    | "active" | "inactive"
    | "default";

/* Using exact colors from the reference design */
const MAP: Record<Variant, string> = {
    available:       "badge green",
    occupied:        "badge blue",
    dirty:           "badge amber",
    maintenance:     "badge red",
    pending:         "badge amber",
    checkedin:       "badge green",
    checkedout:      "badge gray",
    cancelled:       "badge red",
    phone:           "badge gray",
    walkin:          "badge blue",
    roomcharge:      "badge gray",
    restaurantcharge:"badge amber",
    other:           "badge gray",
    active:          "badge green",
    inactive:        "badge red",
    default:         "badge gray",
};

interface Props {
    label: string;
    variant?: Variant;
}

export function Badge({ label, variant = "default" }: Props) {
    return (
        <span className={MAP[variant]}>
            {label}
        </span>
    );
}

export function statusVariant(status: string): Variant {
    return (status.toLowerCase().replace(/[-_\s]/g, "") as Variant) ?? "default";
}

export function roomStatusColor(status: string): string {
    switch (status) {
        case "Available": return "border-l-4 border-l-[#57a23f]";
        case "Occupied": return "border-l-4 border-l-[#2f78c7]";
        case "Dirty": return "border-l-4 border-l-[#c47a3b]";
        case "Maintenance": return "border-l-4 border-l-[#c9423f]";
        default: return "border-l-4 border-l-stone-400";
    }
}