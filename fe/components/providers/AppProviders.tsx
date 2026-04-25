'use client';

import { AssessmentProvider } from '@/context/assessment-context';
import { AuthProvider } from '@/context/auth-context';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <AssessmentProvider>{children}</AssessmentProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
