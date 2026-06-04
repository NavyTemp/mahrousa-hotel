import type { LucideIcon } from "lucide-react";
import {
    Bed,
    BedDouble,
    Bath,
    Tv,
    Wind,
    Wifi,
    Refrigerator,
    Coffee,
    Sofa,
    SquareDashed,
    Wine,
    DoorOpen,
    Users,
} from "lucide-react";
import type { RoomType } from "@/types";

export interface RoomFeature {
    icon: LucideIcon;
    label: string;
}

// Amenities defined per room type. Order matters — it's the order we render
// them in. Each tier inherits the smaller-tier amenities and layers on more.
const SINGLE: RoomFeature[] = [
    { icon: Bed,          label: "1 single bed"   },
    { icon: Users,        label: "Sleeps 1"       },
    { icon: Bath,         label: "1 bathroom"     },
    { icon: Tv,           label: "Smart TV"       },
    { icon: Wind,         label: "Air conditioning" },
    { icon: Wifi,         label: "Free Wi-Fi"     },
    { icon: Refrigerator, label: "Mini fridge"    },
    { icon: Coffee,       label: "Coffee kit"     },
];

const DOUBLE: RoomFeature[] = [
    { icon: BedDouble,    label: "2 double beds"  },
    { icon: Users,        label: "Sleeps 2 – 4"   },
    { icon: Bath,         label: "1 bathroom"     },
    { icon: Tv,           label: "Smart TV"       },
    { icon: Wind,         label: "Air conditioning" },
    { icon: Wifi,         label: "Free Wi-Fi"     },
    { icon: Refrigerator, label: "Mini fridge"    },
    { icon: Coffee,       label: "Coffee kit"     },
    { icon: SquareDashed, label: "Work desk"      },
];

const SUITE: RoomFeature[] = [
    { icon: BedDouble,    label: "2 king beds"    },
    { icon: Sofa,         label: "Sofa bed"       },
    { icon: Users,        label: "Sleeps up to 5" },
    { icon: Bath,         label: "2 bathrooms"    },
    { icon: Tv,           label: "2 smart TVs"    },
    { icon: Wind,         label: "Air conditioning" },
    { icon: Wifi,         label: "Free Wi-Fi"     },
    { icon: Wine,         label: "Mini bar"       },
    { icon: Coffee,       label: "Coffee kit"     },
    { icon: DoorOpen,     label: "Balcony"        },
];

const FEATURES: Record<RoomType, RoomFeature[]> = {
    Single: SINGLE,
    Double: DOUBLE,
    Suite:  SUITE,
};

export function getRoomFeatures(type: RoomType): RoomFeature[] {
    return FEATURES[type] ?? [];
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
