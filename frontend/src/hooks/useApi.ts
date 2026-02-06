'use client';

import { useCallback } from 'react';
import { useLoading } from '@/context/LoadingContext';
import { useToast } from '@/context/ToastContext';

type MessageOrFactory<T> = string | ((value: T) => string);

type ErrorMessageOrFactory = string | ((error: any) => string);

export interface RunApiOptions<T> {
  /** Defaults to true */
  useGlobalLoader?: boolean;

  /** Optional visible success toast */
  successMessage?: MessageOrFactory<T>;

  /** Optional visible error toast. If omitted, we'll use backend message if present, otherwise a default */
  errorMessage?: ErrorMessageOrFactory;

  /** Run BEFORE the API call, used for optimistic UI updates */
  optimisticUpdate?: () => void;

  /** Run ONLY if API call fails and optimisticUpdate was applied */
  rollback?: () => void;

  /** Called after a successful request */
  onSuccess?: (value: T) => void;

  /** Called after a failed request */
  onError?: (error: any) => void;

  /** By default, errors are swallowed after showing toast. Set true if you want the error rethrown. */
  throwOnError?: boolean;
}

function getBackendErrorMessage(error: any): string | undefined {
  return error?.response?.data?.message || error?.message;
}

export function useApi() {
  const { showGlobalLoader, hideGlobalLoader } = useLoading();
  const toast = useToast();

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, options: RunApiOptions<T> = {}): Promise<T | undefined> => {
      const {
        useGlobalLoader = true,
        successMessage,
        errorMessage,
        optimisticUpdate,
        rollback,
        onSuccess,
        onError,
        throwOnError = false,
      } = options;

      if (optimisticUpdate) optimisticUpdate();
      if (useGlobalLoader) showGlobalLoader();

      try {
        const value = await fn();

        if (successMessage) {
          const msg = typeof successMessage === 'function' ? successMessage(value) : successMessage;
          if (msg) toast.success(msg);
        }

        onSuccess?.(value);
        return value;
      } catch (err: any) {
        if (rollback) rollback();

        const backendMsg = getBackendErrorMessage(err);
        const msg =
          typeof errorMessage === 'function'
            ? errorMessage(err)
            : errorMessage || backendMsg || 'Something went wrong';

        if (msg) toast.error(msg);
        onError?.(err);

        if (throwOnError) throw err;
        return undefined;
      } finally {
        if (useGlobalLoader) hideGlobalLoader();
      }
    },
    [hideGlobalLoader, showGlobalLoader, toast]
  );

  return { run };
}
