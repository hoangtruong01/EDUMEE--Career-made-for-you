import AppProviders from '@/components/providers/AppProviders';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import type { Metadata } from 'next';

// Dùng đường dẫn tuyệt đối có chữ @ để không bao giờ bị lỗi path
import './globals.css';

export const metadata: Metadata = {
  title: 'EDUMEE - Career made for you',
  description: 'AI Career Companion - Khám phá nghề nghiệp phù hợp với bạn',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        <AppProviders>
          {children}
          <Toaster />
          <SonnerToaster position="top-right" richColors />
        </AppProviders>
      </body>
    </html>
  );
}
