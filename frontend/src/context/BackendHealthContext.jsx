import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { backendHealthService } from '../services/backendHealthService.js';

const BackendHealthContext = createContext(null);

export function BackendHealthProvider({ children }) {
  const [status, setStatus] = useState(() => (backendHealthService.isSessionWarm() ? 'ready' : 'warming'));
  const [attempt, setAttempt] = useState(1);
  const [maxRetries] = useState(20);
  const isMountedRef = useRef(true);

  const startWarmup = useCallback(async () => {
    if (backendHealthService.isSessionWarm()) {
      setStatus('ready');
      return;
    }

    setStatus('warming');
    setAttempt(1);

    const success = await backendHealthService.warmup({
      maxRetries: 20,
      intervalMs: 3500,
      onAttempt: (currAttempt) => {
        if (isMountedRef.current) {
          setAttempt(currAttempt);
        }
      }
    });

    if (isMountedRef.current) {
      if (success) {
        setStatus('ready');
      } else {
        setStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    startWarmup();

    return () => {
      isMountedRef.current = false;
    };
  }, [startWarmup]);

  const retryWarmup = useCallback(() => {
    startWarmup();
  }, [startWarmup]);

  const value = {
    status,
    isWarming: status === 'warming',
    isReady: status === 'ready',
    isError: status === 'error',
    attempt,
    maxRetries,
    retryWarmup
  };

  return (
    <BackendHealthContext.Provider value={value}>
      {children}
    </BackendHealthContext.Provider>
  );
}

export function useBackendHealth() {
  const context = useContext(BackendHealthContext);
  if (!context) {
    throw new Error('useBackendHealth must be used within a BackendHealthProvider');
  }
  return context;
}
