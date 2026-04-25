'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <Navbar />
      {children}
      <Footer />
    </RouteGuard>
  );
}
