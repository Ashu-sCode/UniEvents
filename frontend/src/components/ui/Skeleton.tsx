import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
}

export function Skeleton({ className, variant = 'rectangular' }: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-neutral-200';

  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-2xl h-48',
  };

  return <div className={cn(baseStyles, variantStyles[variant], className)} />;
}

// Preset skeleton layouts
export function TicketSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-neutral-100 overflow-hidden max-w-sm mx-auto">
      <div className="bg-neutral-200 animate-pulse h-24" />
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="border-t border-dashed border-neutral-200 pt-4 mt-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </div>
        <div className="flex justify-center pt-4">
          <Skeleton className="h-32 w-32" />
        </div>
      </div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-6">
      <Skeleton className="h-5 w-3/4 mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3 mb-4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-2/5" />
      </div>
      <Skeleton className="h-10 w-full mt-5 rounded-xl" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-6 flex items-center gap-4">
      <Skeleton variant="rectangular" className="h-12 w-12 rounded-xl" />
      <div className="flex-1">
        <Skeleton className="h-6 w-16 mb-1" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}
