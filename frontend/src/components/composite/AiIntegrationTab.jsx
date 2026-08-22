import { useState, useMemo } from 'react';
import { Sparkles, Plus, Trash2, Pencil, Star, RefreshCw, Power } from 'lucide-react';
import { useAiSettingsViewModel } from '../../viewmodels/useAiSettingsViewModel.js';
import Button from '../foundations/Button.jsx';
import Input from '../foundations/Input.jsx';
import Select from '../foundations/Select.jsx';
import Modal from '../foundations/Modal.jsx';
import Skeleton from '../foundations/Skeleton.jsx';
import ProviderFieldForm from './ProviderFieldForm.jsx';
import ConnectionStatusNote from './ConnectionStatusNote.jsx';

const STATUS_BADGE = {
  connected: 'badge-success',
  error: 'badge-danger',
  unverified: 'badge-warning',
};

export default function AiIntegrationTab() {
  const vm = useAiSettingsViewModel();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [providerId, setProviderId] = useState('');
  const [label, setLabel] = useState('');
  const [values, setValues] = useState({});
  const [temperature, setTemperature] = useState('0.2');
  const [maxTokens, setMaxTokens] = useState('1024');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const spec = useMemo(() => vm.providers.find((p) => p.id === providerId) || null, [vm.providers, providerId]);

  const openCreate = () => {
    const first = vm.providers[0];
    setEditingId(null);
    setProviderId(first?.id || '');
    setLabel(first?.label || '');
    setValues({ model: first?.defaultModel || '', baseUrl: first?.defaultBaseUrl || '' });
    setTemperature('0.2');
    setMaxTokens('1024');
    vm.clearTestResult();
    setIsFormOpen(true);
  };

  const openEdit = (config) => {
    setEditingId(config.id);
    setProviderId(config.provider);
    setLabel(config.label);
    setValues({ model: config.model, baseUrl: config.baseUrl, apiKey: config.apiKey });
    setTemperature(String(config.temperature ?? 0.2));
    setMaxTokens(String(config.maxTokens ?? 1024));
    vm.clearTestResult();
    setIsFormOpen(true);
  };

  const handleProviderChange = (id) => {
    const next = vm.providers.find((p) => p.id === id);
    setProviderId(id);
    setLabel(next?.label || '');
    setValues({ model: next?.defaultModel || '', baseUrl: next?.defaultBaseUrl || '' });
    vm.clearTestResult();
  };

  const payload = () => ({
    provider: providerId,
    label,
    temperature: Number(temperature),
    maxTokens: Number(maxTokens),
    ...values,
  });

  const handleSave = async () => {
    const result = await vm.save(payload(), editingId);
    if (result?.test?.ok) setIsFormOpen(false);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div className="max-w-xl">
          <h2 className="text-base font-semibold mb-1">AI Integration</h2>
          <p className="text-ink-muted text-[13px] leading-relaxed">
            EKIP answers questions using whichever provider is marked default here. Ollama Cloud running{' '}
            <span className="font-mono text-[12px]">gpt-oss:120b</span> is the platform default and has a free
            tier — paste an API key to activate it, or add OpenAI, Anthropic, Gemini, or any OpenAI-compatible
            endpoint instead. API keys are encrypted at rest.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus size={15} />
          Add provider
        </Button>
      </div>

      {vm.error && !isFormOpen && (
        <div className="bg-danger-tint text-[#B3282C] text-[13px] p-3 rounded-component mb-4">{vm.error}</div>
      )}

      {vm.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : vm.configs.length === 0 ? (
        <div className="card text-center py-10">
          <Sparkles className="mx-auto text-accent-dim mb-3" size={26} />
          <div className="font-semibold text-[14px] mb-1">No AI provider configured</div>
          <p className="text-ink-muted text-[13px] max-w-md mx-auto mb-4">
            Add one to enable the assistant, summaries, and semantic answers.
          </p>
          <Button onClick={openCreate}>
            <Plus size={15} />
            Add provider
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {vm.configs.map((config) => (
            <div
              key={config.id}
              className={`card flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 ${
                config.isDefault ? 'border-accent' : ''
              } ${config.enabled ? '' : 'opacity-60'}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="font-semibold text-[14px]">{config.label}</span>
                  {config.isDefault && (
                    <span className="badge badge-accent">
                      <Star size={10} />
                      Default
                    </span>
                  )}
                  <span className={`badge ${STATUS_BADGE[config.status] || ''}`}>{config.status}</span>
                  {!config.enabled && <span className="badge">Disabled</span>}
                </div>
                <div className="text-[12.5px] text-ink-muted font-mono truncate">
                  {config.providerLabel} · {config.model}
                  {config.hasApiKey ? '' : ' · no API key'}
                </div>
                {config.statusMessage && (
                  <div className="text-[12px] text-ink-muted mt-1.5">{config.statusMessage}</div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => vm.test(config.id)} title="Test connection">
                  <RefreshCw size={14} />
                </Button>
                {!config.isDefault && (
                  <Button variant="secondary" size="sm" onClick={() => vm.setDefault(config.id)}>
                    <Star size={13} />
                    Make default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  title={config.enabled ? 'Disable' : 'Enable'}
                  onClick={() => vm.save({ enabled: !config.enabled }, config.id)}
                >
                  <Power size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(config)} title="Edit">
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(config)} title="Remove">
                  <Trash2 size={14} className="text-danger" />
                </Button>
              </div>
            </div>
          ))}
          {vm.testResult && !isFormOpen && (
            <ConnectionStatusNote result={vm.testResult} isTesting={vm.isTesting} />
          )}
        </div>
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingId ? 'Edit AI provider' : 'Add AI provider'}
        maxWidth="max-w-lg"
      >
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <Select
            label="Provider"
            options={vm.providers.map((p) => ({
              value: p.id,
              label: p.isPlatformDefault ? `${p.label} — free tier` : p.label,
            }))}
            value={providerId}
            disabled={Boolean(editingId)}
            onChange={(e) => handleProviderChange(e.target.value)}
          />
          <Input
            label="Display name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            hint="What this provider is called inside EKIP."
          />

          <ProviderFieldForm spec={spec} values={values} onChange={(k, v) => setValues((c) => ({ ...c, [k]: v }))} />

          {spec?.models?.length > 0 && (
            <div className="mb-4 -mt-1">
              <div className="text-[12px] text-ink-muted mb-1.5">Known models — click to use:</div>
              <div className="flex flex-wrap gap-1.5">
                {spec.models.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setValues((c) => ({ ...c, model: m }))}
                    className={`badge font-mono normal-case ${values.model === m ? 'badge-accent' : ''}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              hint="Lower is more literal."
            />
            <Input
              label="Max tokens"
              type="number"
              min="1"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              hint="Cap on answer length."
            />
          </div>

          {editingId && (
            <p className="text-[12px] text-ink-muted mb-3">
              Leave the API key on its masked value to keep the stored key unchanged.
            </p>
          )}

          <ConnectionStatusNote result={vm.testResult} isTesting={vm.isTesting} />
          {vm.error && <div className="bg-danger-tint text-[#B3282C] text-[13px] p-3 rounded-component mb-3">{vm.error}</div>}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-line mt-1">
          <Button variant="ghost" onClick={() => setIsFormOpen(false)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => vm.test(payload())} loading={vm.isTesting}>
            Test connection
          </Button>
          <Button onClick={handleSave} loading={vm.isSaving}>
            {editingId ? 'Save changes' : 'Add provider'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title="Remove this AI provider?">
        <p className="text-[13px] text-ink-muted mb-5 leading-relaxed">
          <strong className="text-ink">{confirmDelete?.label}</strong> and its stored API key will be removed
          from EKIP.
          {confirmDelete?.isDefault && ' Another configured provider will automatically become the default.'}
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await vm.remove(confirmDelete.id);
              setConfirmDelete(null);
            }}
          >
            Remove provider
          </Button>
        </div>
      </Modal>
    </div>
  );
}
