'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';

interface AsyncImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
  fallback?: React.ReactNode;
}

export function AsyncImage({
  src,
  alt,
  className,
  wrapperClassName,
  fallback,
  onLoad,
  onError,
  ...props
}: AsyncImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const showFallback = !src || hasError;

  return (
    <div className={cn('relative h-full w-full overflow-hidden', wrapperClassName)}>
      {!isLoaded && !showFallback && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-none bg-neutral-200" />
      )}

      {showFallback ? (
        fallback ?? <div className="h-full w-full bg-neutral-100" />
      ) : (
        <img
          src={src}
          alt={alt}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          onLoad={(event) => {
            setIsLoaded(true);
            onLoad?.(event);
          }}
          onError={(event) => {
            setHasError(true);
            onError?.(event);
          }}
          {...props}
        />
      )}
    </div>
  );
}
