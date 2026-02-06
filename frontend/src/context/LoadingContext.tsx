'use client';

import { createContext, useContext, useMemo, useState } from 'react';

interface LoadingContextType {
  isGlobalLoading: boolean;
  showGlobalLoader: () => void;
  hideGlobalLoader: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  // ref-count to allow nested/parallel operations
  const [count, setCount] = useState(0);

  const value = useMemo<LoadingContextType>(() => {
    return {
      isGlobalLoading: count > 0,
      showGlobalLoader: () => setCount((c) => c + 1),
      hideGlobalLoader: () => setCount((c) => Math.max(0, c - 1)),
    };
  }, [count]);

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used within a LoadingProvider');
  return ctx;
}
