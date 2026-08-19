import { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService.js';

export function useAnalyticsViewModel({ evaluation = false } = {}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const result = evaluation ? await analyticsService.evaluation() : await analyticsService.department();
        setData(result);
      } catch {
        setError('Could not load analytics.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [evaluation]);

  return { data, isLoading, error };
}
