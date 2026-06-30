import CategoryProductGrid from '@/components/CategoryProductGrid';

export const metadata = {
  title: 'Food & Delivery — Drovo',
  description: 'Browse menu items from every restaurant and food vendor on Drovo.',
};

export default function FoodCategoryPage() {
  return <CategoryProductGrid category="food" />;
}
