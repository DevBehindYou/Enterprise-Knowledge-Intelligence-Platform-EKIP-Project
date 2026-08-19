import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settingsService.js';

const readError = (err, fallback) => err.response?.data?.error?.message || fallback;

export function useAiSettingsViewModel() {
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
        settingsService.getAiProviders(),
        settingsService.listAiConfigs(),
      ]);
      setProviders(providerList);
      setConfigs(configList);
    } catch (err) {
      setError(readError(err, 'Could not load AI settings.'));
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
          ? await settingsService.updateAiConfig(editingId, payload)
          : await settingsService.createAiConfig(payload);
        await load();
        setTestResult(result.test);
        return result;
      } catch (err) {
        setError(readError(err, 'Could not save this AI provider.'));
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
      const result = await settingsService.testAiConfig(idOrPayload);
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

  const setDefault = useCallback(
    async (id) => {
      setError(null);
      try {
        await settingsService.setDefaultAiConfig(id);
        await load();
        return true;
      } catch (err) {
        setError(readError(err, 'Could not set this as the default provider.'));
        return false;
      }
    },
    [load]
  );

  const remove = useCallback(
    async (id) => {
      setError(null);
      try {
        await settingsService.deleteAiConfig(id);
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
    defaultConfig: configs.find((c) => c.isDefault) || null,
    isLoading,
    isSaving,
    isTesting,
    error,
    testResult,
    clearTestResult: () => setTestResult(null),
    reload: load,
    save,
    test,
    setDefault,
    remove,
  };
}
