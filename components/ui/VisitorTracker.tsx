'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackVisit } from '@/lib/visitor-tracker';

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      trackVisit(pathname);
    }
  }, [pathname]);

  return null;
}
