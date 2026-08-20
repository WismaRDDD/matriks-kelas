'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DosenDashboardHome() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard/dosen/profile');
  }, [router]);

  return <div>Redirecting...</div>;
}
