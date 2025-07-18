'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <Image src="/cirruslabs-logo.png" alt="CirrusLabs" width={80} height={80} className="mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Data Preparedness Studio</h1>
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}