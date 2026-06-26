import CategoryProductGrid from '@/components/CategoryProductGrid';

export const metadata = {
  title: 'Food & Delivery — AfriCart',
  description: 'Browse menu items from every restaurant and food vendor on AfriCart.',
};

export default function FoodCategoryPage() {
  return <CategoryProductGrid category="food" />;
}
