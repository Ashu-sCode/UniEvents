'use client';

import { useLoading } from '@/context/LoadingContext';
import { LoadingMessage } from '@/components/ui';

export function GlobalLoader() {
  const { isGlobalLoading } = useLoading();

  if (!isGlobalLoading) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px]" />
      <div className="relative rounded-[28px] border border-neutral-200 bg-white px-8 py-7 shadow-xl">
        <LoadingMessage title="Working on it" message="We are processing your request." />
      </div>
    </div>
  );
}
