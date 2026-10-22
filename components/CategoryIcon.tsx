import {
  UtensilsCrossed, Home, Building2, Shirt, Store, ShoppingBag, Package,
  type LucideIcon,
} from 'lucide-react';

// Turns an icon NAME (like "UtensilsCrossed") into the real icon.
// Add a line here whenever a category uses a new icon name.
const ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed, Home, Building2, Shirt, Store, ShoppingBag, Package,
};

/**
 * <CategoryIcon icon={meta?.icon} className="w-8 h-8" />
 * - a known name       -> the lucide icon
 * - an emoji / any text -> shown as text (so old data still works)
 * - nothing / unknown name -> a store icon, never the raw word
 */
export default function CategoryIcon({ icon, className = 'w-5 h-5' }: { icon?: string | null; className?: string }) {
  if (!icon) return <Store className={className} />;
  const Icon = ICONS[icon];
  if (Icon) return <Icon className={className} />;
  if (/^[A-Za-z0-9]+$/.test(icon)) return <Store className={className} />;   // an unknown icon NAME
  return <span className={className}>{icon}</span>;                           // an emoji
}