import CategoryProductGrid from '@/components/CategoryProductGrid';

export const metadata = {
  title: 'Fashion & Fabric — AfriCart',
  description: 'Browse fashion items, fabric and accessories from every vendor on AfriCart.',
};

export default function FashionCategoryPage() {
  return <CategoryProductGrid category="fashion" />;
}
