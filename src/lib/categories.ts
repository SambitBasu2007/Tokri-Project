import {
  Apple,
  Carrot,
  Cookie,
  Croissant,
  CupSoda,
  Droplets,
  HeartPulse,
  House,
  LayoutGrid,
  Milk,
  Sparkles,
  SprayCan,
  Timer,
  Wheat,
  type LucideIcon,
} from 'lucide-react';

/** Icons are presentational; every label still comes from the catalog. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  dairy: Milk,
  bakery: Croissant,
  atta: Wheat,
  oil: Droplets,
  fruits: Apple,
  vegetables: Carrot,
  snacks: Cookie,
  instant: Timer,
  beverages: CupSoda,
  personal: Sparkles,
  cleaning: SprayCan,
  household: House,
  health: HeartPulse,
};

export function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? LayoutGrid;
}
