import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = true }: CardProps) {
  return (
    <div className={cn('card', !hover && 'hover:shadow-sm', className)}>
      {children}
    </div>
  );
}
