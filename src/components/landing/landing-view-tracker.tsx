'use client';

import { useEffect } from 'react';
import { trackOnce, trackViewLanding } from '@/lib/analytics';

export function LandingViewTracker() {
  useEffect(() => {
    trackOnce('view_landing', () => trackViewLanding());
  }, []);
  return null;
}
