import AppProviders from '@/components/providers/AppProviders';
import { Toaster } from '@/components/ui/toaster';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';

// Dùng đường dẫn tuyệt đối có chữ @ để không bao giờ bị lỗi path
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin', 'vietnamese'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
});

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
      <body suppressHydrationWarning className={`${plusJakartaSans.variable} antialiased`}>
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
