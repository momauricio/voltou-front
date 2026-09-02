'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAuthMe, getStoredAccessToken } from '@/lib/api';
import { isStaffRole } from '@/lib/staff-crm';

/** Staff JWT must not land on lojista nav (produtos, regras, etc.). */
export function RedirectStaffFromPainel() {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;
    void fetchAuthMe(token)
      .then(({ user }) => {
        if (isStaffRole(user.role)) {
          router.replace('/equipe');
        }
      })
      .catch(() => undefined);
  }, [router]);

  return null;
}
