// Category SEO metadata for ShopFloorSpicks
// Type keys MUST match commercialtoolry (industrial, electronics, materials, etc.)

export interface TypeSEO {
  title: string;
  description: string;
  label: string;
  color: string;
  icon: string;
}

export const TYPE_MAP: Record<string, TypeSEO> = {
  industrial: {
    title: "Heavy Equipment & Machinery",
    description: "Hands-on reviews of industrial machinery, CNC systems, hydraulic presses, and factory-floor equipment for serious operators.",
    label: "Heavy Equipment",
    color: "#c0392b",
    icon: "fa-industry",
  },
  electronics: {
    title: "Electronic Components & Systems",
    description: "Deep dives into circuit boards, sensors, power modules, and control systems that keep commercial operations running.",
    label: "Electronics",
    color: "#2980b9",
    icon: "fa-microchip",
  },
  materials: {
    title: "Raw Materials & Chemical Supplies",
    description: "Technical guides on metals, polymers, composites, and specialty chemicals used in manufacturing and construction.",
    label: "Raw Materials",
    color: "#d4a574",
    icon: "fa-flask",
  },
  automotive: {
    title: "Automotive Parts & Accessories",
    description: "Professional-grade reviews of OEM and aftermarket parts, diagnostic scanners, and shop-floor vehicle maintenance tools.",
    label: "Auto Parts",
    color: "#8e44ad",
    icon: "fa-car",
  },
  home: {
    title: "Home Improvement & Garden Tools",
    description: "Curated picks for power tools, landscaping gear, plumbing fixtures, and everything needed for home renovation projects.",
    label: "Home & Garden",
    color: "#5d7a4a",
    icon: "fa-home",
  },
  fashion: {
    title: "Apparel & Textile Equipment",
    description: "Industry coverage of garment machinery, textile tools, commercial sewing equipment, and fashion production gear.",
    label: "Apparel & Textile",
    color: "#c2185b",
    icon: "fa-tshirt",
  },
  health: {
    title: "Health & Medical Equipment",
    description: "Specs and reviews for clinical instruments, diagnostic devices, and healthcare facility supplies trusted by professionals.",
    label: "Medical Gear",
    color: "#00897b",
    icon: "fa-heartbeat",
  },
  food: {
    title: "Food Processing & Beverage Equipment",
    description: "Essential guides for commercial kitchen gear, food safety instruments, and beverage production machinery.",
    label: "Food & Beverage",
    color: "#e65100",
    icon: "fa-utensils",
  },
  sports: {
    title: "Sports & Outdoor Equipment",
    description: "Expert-curated picks for athletic gear, fitness machines, outdoor recreation equipment, and sporting goods.",
    label: "Sports & Outdoors",
    color: "#558b2f",
    icon: "fa-futbol",
  },
  pets: {
    title: "Pet Supplies & Veterinary Tools",
    description: "Guides covering pet care products, grooming equipment, veterinary instruments, and animal housing systems.",
    label: "Pet & Vet",
    color: "#ef6c00",
    icon: "fa-paw",
  },
  more: {
    title: "General Commercial Equipment",
    description: "Cross-industry tools, office equipment, janitorial supplies, and everything else that keeps businesses running.",
    label: "More",
    color: "#546e7a",
    icon: "fa-ellipsis-h",
  },
};

export function getTypeInfo(type: string): TypeSEO | null {
  return TYPE_MAP[type] || null;
}

export function getAllTypes() {
  return Object.entries(TYPE_MAP).map(([key, val]) => ({ key, ...val }));
}
