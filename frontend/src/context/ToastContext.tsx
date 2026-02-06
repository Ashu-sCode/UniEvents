'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, duration = DEFAULT_DURATION) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, message, duration };
    
    setToasts(prev => [...prev, newToast]);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    addToast('success', message, duration);
  }, [addToast]);

  const error = useCallback((message: string, duration?: number) => {
    addToast('error', message, duration);
  }, [addToast]);

  const warning = useCallback((message: string, duration?: number) => {
    addToast('warning', message, duration);
  }, [addToast]);

  const info = useCallback((message: string, duration?: number) => {
    addToast('info', message, duration);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, success, error, warning, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Toast Container Component
function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <>
      {/* Desktop: Top-right */}
      <div className="hidden sm:flex fixed top-4 right-4 z-[100] flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
      
      {/* Mobile: Bottom-center */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </>
  );
}

// Individual Toast Item
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-neutral-900 flex-shrink-0" />,
    error: <XCircle className="h-5 w-5 text-neutral-900 flex-shrink-0" />,
    warning: <Info className="h-5 w-5 text-neutral-900 flex-shrink-0" />,
    info: <Info className="h-5 w-5 text-neutral-900 flex-shrink-0" />,
  };

  const borderAccent = {
    success: 'border-neutral-900/20',
    error: 'border-neutral-900/40',
    warning: 'border-neutral-900/20',
    info: 'border-neutral-900/20',
  };

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg',
        'bg-white text-neutral-900',
        'animate-in slide-in-from-right-full sm:slide-in-from-top-2 fade-in duration-300',
        'max-w-sm w-full sm:w-auto sm:min-w-[320px]',
        borderAccent[toast.type]
      )}
    >
      {icons[toast.type]}
      <p className={cn('flex-1 text-sm font-medium text-neutral-800')}>
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className={cn(
          'p-1 rounded-lg transition-colors flex-shrink-0',
          'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
