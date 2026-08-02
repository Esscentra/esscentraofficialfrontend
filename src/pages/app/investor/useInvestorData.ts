import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@/lib/utils';

/**
 * A tiny data hook shared by every investor page.
 *
 * It exists so all fifteen pages get the same three states — loading, error
 * with a retry, and loaded — without each one hand-rolling its own `useEffect`
 * and drifting in behaviour.
 *
 * Two details worth keeping:
 *
 *  - A stale response never overwrites a fresh one. Change the date range
 *    twice quickly and the slower first request will land second; without the
 *    request counter it would clobber the correct data with the old data.
 *
 *  - `refresh()` keeps the existing data on screen while it refetches, so a
 *    background refresh does not blank the page the user is reading.
 */
export function useInvestorData<T>(
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

  // Incremented on every request; only the newest is allowed to write state.
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
      setError(getErrorMessage(thrown, 'Could not load this data.'));
    } finally {
      if (mounted.current && requestId.current === id) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // The fetcher is rebuilt on every render by design; `deps` is what
    // actually decides when to refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, refreshing, error, reload: () => void run() };
}
