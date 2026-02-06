'use client';

import { Loader2 } from 'lucide-react';
import { useLoading } from '@/context/LoadingContext';

export function GlobalLoader() {
  const { isGlobalLoading } = useLoading();

  if (!isGlobalLoading) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px]" />
      <div className="relative flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-5 shadow-xl border border-neutral-200">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-900" />
        <p className="text-sm font-medium text-neutral-700">Please wait…</p>
      </div>
    </div>
  );
}
