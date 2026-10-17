'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Open dashboard directly
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FAF8F3]">
      <p className="text-muted-foreground font-serif italic">Opening Ledger...</p>
    </div>
  );
}
