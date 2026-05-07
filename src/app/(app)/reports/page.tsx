'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/reports/customers');
  }, [router]);

  return null; // Or a loading spinner
}
