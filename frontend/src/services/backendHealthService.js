import { apiClient } from '../lib/apiClient.js';

let inFlightWarmupPromise = null;
let isKnownWarm = false;

export const backendHealthService = {
  /**
   * Check if backend was already confirmed warm during this browser session.
   */
  isSessionWarm() {
    if (isKnownWarm) return true;
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('ekip_backend_warm') === 'true') {
        isKnownWarm = true;
        return true;
      }
    } catch {
      // ignore storage errors in restricted contexts
    }
    return false;
  },

  /**
   * Mark backend as warm in memory and session storage.
   */
  markSessionWarm() {
    isKnownWarm = true;
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('ekip_backend_warm', 'true');
      }
    } catch {
      // ignore storage errors
    }
  },

  /**
   * Lightweight health check request with a short per-request timeout.
   */
  async checkHealth(timeoutMs = 10000) {
    const res = await apiClient.get('/health', {
      timeout: timeoutMs,
      // Avoid browser caching of health responses
      headers: { 'Cache-Control': 'no-cache, no-store' }
    });
    return res.data;
  },

  /**
   * Orchestrates the warm-up sequence with deduplication and paced polling.
   *
   * @param {Object} options
   * @param {number} [options.maxRetries=20] - Max check iterations (~70s total)
   * @param {number} [options.intervalMs=3500] - Pause between retries
   * @param {Function} [options.onAttempt] - Callback invoked on each ping attempt
   * @returns {Promise<boolean>} Resolves true when healthy, false on timeout
   */
  async warmup({ maxRetries = 22, intervalMs = 3500, onAttempt } = {}) {
    // If already confirmed warm in this session, resolve immediately
    if (this.isSessionWarm()) {
      return true;
    }

    // Deduplicate: if another component already started the warmup loop, share it
    if (inFlightWarmupPromise) {
      return inFlightWarmupPromise;
    }

    inFlightWarmupPromise = (async () => {
      let attempts = 0;

      while (attempts < maxRetries) {
        attempts++;
        if (typeof onAttempt === 'function') {
          onAttempt(attempts, maxRetries);
        }

        try {
          const data = await this.checkHealth(8000);
          if (data && (data.status === 'ok' || data.mongoConnected !== undefined)) {
            this.markSessionWarm();
            return true;
          }
        } catch (err) {
          // Network error or timeout indicates backend is still waking up
          // Continue loop unless reached max retries
        }

        // Wait interval before next attempt
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }

      return false;
    })().finally(() => {
      inFlightWarmupPromise = null;
    });

    return inFlightWarmupPromise;
  }
};
