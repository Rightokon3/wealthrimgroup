'use client';
import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import Footer from './Footer';

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname?.startsWith('/rider');

  return (
    <>
      {!hideChrome && <Navigation />}
      <main className="min-h-screen">{children}</main>
      {!hideChrome && <Footer />}
    </>
  );
}