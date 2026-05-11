'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DosenDashboardHome() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dosen/dashboard/profile');
  }, [router]);

  return <div>Redirecting...</div>;
}
