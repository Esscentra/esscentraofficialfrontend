import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@/lib/utils';

/**
 * The data hook shared by every page in the contractor workspace.
 *
 * Same three states on every page — loading, error with a retry, loaded —
 * without each one hand-rolling its own effect and drifting in behaviour.
 *
 * Two details worth keeping:
 *
 *  - A stale response never overwrites a fresh one. Switch a filter twice
 *    quickly and the slower first request lands second; without the request
 *    counter it would clobber the correct data with the old data.
 *
 *  - `reload()` keeps the current data on screen while refetching, so a
 *    background refresh does not blank the page the user is reading.
 */
export function useMarketerData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);
  const mounted = useRef(true);
  const hasData = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;

    if (hasData.current) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await fetcher();
      if (!mounted.current || requestId.current !== id) return;

      setData(result);
      setError(null);
      hasData.current = true;
    } catch (thrown) {
      if (!mounted.current || requestId.current !== id) return;
      setError(getErrorMessage(thrown));
    } finally {
      if (mounted.current && requestId.current === id) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, refreshing, error, reload: () => void run() };
}
