import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settingsService.js';

const readError = (err, fallback) => err.response?.data?.error?.message || fallback;

export function useStorageSettingsViewModel() {
  const [providers, setProviders] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [providerList, configList] = await Promise.all([
        settingsService.getStorageProviders(),
        settingsService.listStorageConfigs(),
      ]);
      setProviders(providerList);
      setConfigs(configList);
    } catch (err) {
      setError(readError(err, 'Could not load storage settings.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (payload, editingId) => {
      setIsSaving(true);
      setError(null);
      setTestResult(null);
      try {
        const result = editingId
          ? await settingsService.updateStorageConfig(editingId, payload)
          : await settingsService.createStorageConfig(payload);
        await load();
        // The backend verifies credentials on save, so surface that verdict
        // rather than a bare "Saved" that might be hiding a broken connection.
        setTestResult(result.test);
        return result;
      } catch (err) {
        setError(readError(err, 'Could not save this storage provider.'));
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [load]
  );

  const test = useCallback(async (idOrPayload) => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const result = await settingsService.testStorageConfig(idOrPayload);
      setTestResult(result);
      return result;
    } catch (err) {
      const message = readError(err, 'The connection test could not be run.');
      setTestResult({ ok: false, message });
      return { ok: false, message };
    } finally {
      setIsTesting(false);
    }
  }, []);

  const activate = useCallback(
    async (id) => {
      setError(null);
      try {
        await settingsService.activateStorageConfig(id);
        await load();
        return true;
      } catch (err) {
        setError(readError(err, 'Could not activate this provider.'));
        return false;
      }
    },
    [load]
  );

  const remove = useCallback(
    async (id) => {
      setError(null);
      try {
        await settingsService.deleteStorageConfig(id);
        await load();
        return true;
      } catch (err) {
        setError(readError(err, 'Could not remove this provider.'));
        return false;
      }
    },
    [load]
  );

  return {
    providers,
    configs,
    activeConfig: configs.find((c) => c.isActive) || null,
    isLoading,
    isSaving,
    isTesting,
    error,
    testResult,
    clearTestResult: () => setTestResult(null),
    reload: load,
    save,
    test,
    activate,
    remove,
  };
}
