import CategoryProductGrid from '@/components/CategoryProductGrid';

export const metadata = {
  title: 'Real Estate — AfriCart',
  description: 'Browse properties for sale, rent, lease and shortlet from every agent on AfriCart.',
};

export default function RealEstateCategoryPage() {
  return <CategoryProductGrid category="real_estate" />;
}
