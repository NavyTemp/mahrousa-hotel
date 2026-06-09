import type { LucideIcon } from "lucide-react";
import {
    Bed, BedDouble, Sofa,
    Tv, Wind, Refrigerator, Lock, Coffee, Sparkles,
    Bath, Droplets,
    SquareDashed, Shirt, DoorOpen,
} from "lucide-react";
import type { RoomFeature, RoomFeatureType, RoomType } from "@/types";

export interface RoomFeatureDisplay {
    icon: LucideIcon;
    label: string;
    quantity: number;
    notes: string | null;
    id: number;
    type: RoomFeatureType;
}

// Per-feature icon + display label (English; the i18n layer translates labels
// at render time). The backend is the source of truth for what each room
// *actually* contains; this map only chooses how to render each enum value.
const FEATURE_META: Record<RoomFeatureType, { icon: LucideIcon; label: string }> = {
    SingleBed:      { icon: Bed,          label: "Single bed"      },
    DoubleBed:      { icon: BedDouble,    label: "Double bed"      },
    QueenBed:       { icon: BedDouble,    label: "Queen bed"       },
    KingBed:        { icon: BedDouble,    label: "King bed"        },
    SofaBed:        { icon: Sofa,         label: "Sofa bed"        },

    Tv:             { icon: Tv,           label: "TV"              },
    AirConditioner: { icon: Wind,         label: "Air conditioner" },
    MiniFridge:     { icon: Refrigerator, label: "Mini fridge"     },
    Safe:           { icon: Lock,         label: "Safe"            },
    Hairdryer:      { icon: Sparkles,     label: "Hairdryer"       },
    Kettle:         { icon: Coffee,       label: "Kettle"          },

    Bathtub:        { icon: Bath,         label: "Bathtub"         },
    Shower:         { icon: Droplets,     label: "Shower"          },

    Desk:           { icon: SquareDashed, label: "Desk"            },
    Sofa:           { icon: Sofa,         label: "Sofa"            },
    Wardrobe:       { icon: Shirt,        label: "Wardrobe"        },
    Balcony:        { icon: DoorOpen,     label: "Balcony"         },
};

/**
 * Decorate the live backend features for a room with the icon + label needed
 * to render them. Sorted by label so the order is stable per render.
 */
export function decorateRoomFeatures(features: RoomFeature[]): RoomFeatureDisplay[] {
    return features
        .map(f => {
            const meta = FEATURE_META[f.type] ?? { icon: SquareDashed, label: f.type };
            return {
                id: f.id,
                type: f.type,
                quantity: f.quantity,
                notes: f.notes,
                icon: meta.icon,
                label: meta.label,
            };
        })
        .sort((a, b) => a.label.localeCompare(b.label));
}

/** Icon for a given feature type, used by the admin editor's dropdown. */
export function getFeatureIcon(type: RoomFeatureType): LucideIcon {
    return FEATURE_META[type]?.icon ?? SquareDashed;
}

/** English label for a given feature type, used as an i18n key. */
export function getFeatureLabel(type: RoomFeatureType): string {
    return FEATURE_META[type]?.label ?? type;
}

// Short tagline shown next to the type pill in compact contexts.
export function getRoomTypeBlurb(type: RoomType): string {
    switch (type) {
        case "Single": return "Cozy room for one";
        case "Double": return "Spacious room for couples or small families";
        case "Suite":  return "Premium suite with extra living space";
        default:       return "";
    }
}
