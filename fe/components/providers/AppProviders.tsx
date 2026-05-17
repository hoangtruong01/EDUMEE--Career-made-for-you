'use client';

import { AssessmentProvider } from '@/context/assessment-context';
import { AuthProvider } from '@/context/auth-context';
import { BookingChatProvider } from '@/context/booking-chat-context';
import { NotificationProvider } from '@/context/notification-context';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import AnalyticsTracker from './AnalyticsTracker';
import QueryProvider from './QueryProvider';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryProvider>
        <AuthProvider>
          <NotificationProvider>
            <BookingChatProvider>
              <AssessmentProvider>
                <AnalyticsTracker />
                {children}
              </AssessmentProvider>
            </BookingChatProvider>
          </NotificationProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
