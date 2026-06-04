'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import strings from '@/lib/i18n/home-strings.ko.json';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Root entry redirects to the dashboard (the operator's home).
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
        <p className="text-gray-400">{strings.loading}</p>
      </div>
    </div>
  );
}
