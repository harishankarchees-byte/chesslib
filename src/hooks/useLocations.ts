import { useEffect, useState, useCallback } from 'react';
import { fetchLocations } from '@/lib/queries';
import type { Location } from '@/lib/types';

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLocations(await fetchLocations());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load locations';
      setError(msg);
      console.error('useLocations error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { locations, loading, error, reload: load };
}
