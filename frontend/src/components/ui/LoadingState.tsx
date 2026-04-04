import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EventCardSkeleton, Skeleton, StatCardSkeleton, TicketSkeleton } from './Skeleton';

type GridVariant = 'events' | 'tickets' | 'stats' | 'cards';

interface LoadingMessageProps {
  title?: string;
  message?: string;
  className?: string;
  compact?: boolean;
}

export function LoadingMessage({
  title = 'Loading',
  message = 'Please wait while we get everything ready.',
  className,
  compact = false,
}: LoadingMessageProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-2' : 'gap-3', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-sm">
        <Loader2 className={cn('animate-spin', compact ? 'h-4 w-4' : 'h-5 w-5')} />
      </div>
      <div className="space-y-1">
        <p className={cn('font-semibold text-neutral-900', compact ? 'text-sm' : 'text-base')}>{title}</p>
        <p className={cn('text-neutral-500', compact ? 'text-xs' : 'text-sm')}>{message}</p>
      </div>
    </div>
  );
}

export function PageLoader({
  title,
  message,
  className,
}: Omit<LoadingMessageProps, 'compact'>) {
  return (
    <div className={cn('min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12', className)}>
      <div className="w-full max-w-md rounded-[28px] border border-neutral-200 bg-white p-8 shadow-sm">
        <LoadingMessage title={title} message={message} />
      </div>
    </div>
  );
}

export function SectionLoader({
  title = 'Refreshing content',
  message = 'This section will update in a moment.',
  className,
}: Omit<LoadingMessageProps, 'compact'>) {
  return (
    <div className={cn('rounded-[28px] border border-neutral-200 bg-white px-6 py-12 shadow-sm', className)}>
      <LoadingMessage title={title} message={message} compact />
    </div>
  );
}

export function ModalPreviewLoader({
  title = 'Preparing preview',
  message = 'The document preview is loading.',
  className,
}: Omit<LoadingMessageProps, 'compact'>) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 text-center text-neutral-500', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-neutral-900 shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        <p className="mt-1 text-sm text-neutral-500">{message}</p>
      </div>
    </div>
  );
}

export function LoadingGrid({
  variant = 'cards',
  count = 6,
  className,
}: {
  variant?: GridVariant;
  count?: number;
  className?: string;
}) {
  if (variant === 'stats') {
    return (
      <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-4', className)}>
        {Array.from({ length: count }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (variant === 'tickets') {
    return (
      <div className={cn('grid gap-5 md:grid-cols-2 lg:grid-cols-3', className)}>
        {Array.from({ length: count }).map((_, index) => (
          <TicketSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (variant === 'events') {
    return (
      <div className={cn('grid gap-5 md:grid-cols-2 lg:grid-cols-3', className)}>
        {Array.from({ length: count }).map((_, index) => (
          <EventCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
          <Skeleton className="mb-3 h-5 w-1/2" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
