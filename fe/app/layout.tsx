import AppProviders from '@/components/providers/AppProviders';
import { Toaster } from '@/components/ui/toaster';
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
        </AppProviders>
      </body>
    </html>
  );
}
