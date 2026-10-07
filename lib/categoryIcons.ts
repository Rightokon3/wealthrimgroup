import { UtensilsCrossed, Building2, Shirt, ShoppingBag, type LucideIcon } from 'lucide-react';
import type { StoreCategory } from '@/types';

// One place that decides which Lucide icon represents each store category.
export const CATEGORY_ICONS: Record<StoreCategory, LucideIcon> = {
  food:        UtensilsCrossed,
  real_estate: Building2,
  fashion:     Shirt,
};

export function getCategoryIcon(category: StoreCategory): LucideIcon {
  return CATEGORY_ICONS[category] ?? ShoppingBag;
}