import CategoryProductGrid from '@/components/CategoryProductGrid';

export const metadata = {
  title: 'Real Estate — Drovo',
  description: 'Browse properties for sale, rent, lease and shortlet from every agent on Drovo.',
};

export default function RealEstateCategoryPage() {
  return <CategoryProductGrid category="real_estate" />;
}
