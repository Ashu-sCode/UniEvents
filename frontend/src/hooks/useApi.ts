'use client';

import type { AxiosError } from 'axios';
import { useCallback } from 'react';
import { useLoading } from '@/context/LoadingContext';
import { useToast } from '@/context/ToastContext';
import type { ApiErrorResponse } from '@/types';

type MessageOrFactory<T> = string | ((value: T) => string);

type ApiError = AxiosError<ApiErrorResponse>;
type ErrorMessageOrFactory = string | ((error: ApiError) => string);

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
  onError?: (error: ApiError) => void;

  /** By default, errors are swallowed after showing toast. Set true if you want the error rethrown. */
  throwOnError?: boolean;
}

function getBackendErrorMessage(error: ApiError): string | undefined {
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
      } catch (err) {
        const apiError = err as ApiError;
        if (rollback) rollback();

        const backendMsg = getBackendErrorMessage(apiError);
        const msg =
          typeof errorMessage === 'function'
            ? errorMessage(apiError)
            : errorMessage || backendMsg || 'Something went wrong';

        if (msg) toast.error(msg);
        onError?.(apiError);

        if (throwOnError) throw apiError;
        return undefined;
      } finally {
        if (useGlobalLoader) hideGlobalLoader();
      }
    },
    [hideGlobalLoader, showGlobalLoader, toast]
  );

  return { run };
}
