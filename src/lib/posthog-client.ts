'use client';

import posthog from 'posthog-js';
import {
  resolvePosthogHost,
  resolvePosthogKey,
  setAnalyticsSinks,
} from './analytics.ts';

let started = false;

/**
 * Init PostHog once on the client. person_profiles identified_only so we never
 * create a person from email/phone — identify uses store_id or a signup UUID.
 */
export function initPosthog(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  posthog.init(resolvePosthogKey(), {
    api_host: resolvePosthogHost(),
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
  });

  setAnalyticsSinks({
    capture: (event, properties) => {
      posthog.capture(event, properties);
    },
    identify: (distinctId) => {
      posthog.identify(distinctId);
    },
  });
}
