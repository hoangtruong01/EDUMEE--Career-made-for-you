'use client';

import { adminService } from '@/lib/admin.service';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const ANONYMOUS_ID_KEY = 'edumee_anonymous_id';

function getAnonymousId() {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(ANONYMOUS_ID_KEY);
  if (existing) return existing;

  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(ANONYMOUS_ID_KEY, generated);
  return generated;
}

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || typeof window === 'undefined') return;

    const path = `${pathname}${window.location.search || ''}`;
    adminService
      .trackEvent({
        eventType: 'page_view',
        path,
        anonymousId: getAnonymousId(),
        metadata: {
          title: document.title,
          referrer: document.referrer || undefined,
        },
      })
      .catch(() => {
        // Analytics must never interrupt the user flow.
      });
  }, [pathname]);

  return null;
}
