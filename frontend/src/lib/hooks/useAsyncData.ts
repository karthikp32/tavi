"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

interface UseAsyncDataResult<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  setData: Dispatch<SetStateAction<T>>;
}

/**
 * Runs `fetcher` whenever `deps` change, tracking loading/error state and
 * ignoring results that resolve after the effect has been superseded or
 * unmounted.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  initialData: T,
  errorMessage: string,
): UseAsyncDataResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetcher();
        if (!isCancelled) setData(result);
      } catch {
        if (!isCancelled) setError(errorMessage);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, isLoading, error, setData };
}
