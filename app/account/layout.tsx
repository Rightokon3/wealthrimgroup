import VerifiedGuard from '@/components/auth/VerifiedGuard';

// Everything inside this route is hidden until the visitor is logged in with a verified email.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <VerifiedGuard>{children}</VerifiedGuard>;
}