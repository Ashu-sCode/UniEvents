import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Add extra bottom padding for mobile thumb reach */
  safeBottom?: boolean;
}

export function PageContainer({
  children,
  className,
  maxWidth = 'full',
  safeBottom = false,
}: PageContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    full: 'max-w-7xl',
  };

  return (
    <div
      className={cn(
        'mx-auto px-4 sm:px-6 lg:px-8',
        maxWidthClasses[maxWidth],
        safeBottom && 'pb-24 sm:pb-10', // Extra bottom padding for mobile
        className
      )}
    >
      {children}
    </div>
  );
}

// Section component for consistent spacing
interface SectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function Section({ children, className, title, subtitle }: SectionProps) {
  return (
    <section className={cn('py-6 sm:py-8', className)}>
      {(title || subtitle) && (
        <div className="mb-4 sm:mb-6">
          {title && (
            <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

// Sticky bottom action bar for mobile
interface StickyBottomProps {
  children: React.ReactNode;
  className?: string;
}

export function StickyBottom({ children, className }: StickyBottomProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 inset-x-0 p-4 bg-white/95 backdrop-blur-sm border-t border-neutral-100',
        'sm:relative sm:p-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none',
        className
      )}
    >
      {children}
    </div>
  );
}
