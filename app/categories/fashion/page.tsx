import CategoryProductGrid from '@/components/CategoryProductGrid';

export const metadata = {
  title: 'Fashion & Fabric — Drovo',
  description: 'Browse fashion items, fabric and accessories from every vendor on Drovo.',
};

export default function FashionCategoryPage() {
  return <CategoryProductGrid category="fashion" />;
}
