import { useState, useMemo } from 'react';
import { HardDrive, Plus, Trash2, Pencil, CheckCircle2, Zap, RefreshCw } from 'lucide-react';
import { useStorageSettingsViewModel } from '../../viewmodels/useStorageSettingsViewModel.js';
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

export default function StorageIntegrationTab() {
  const vm = useStorageSettingsViewModel();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [providerId, setProviderId] = useState('');
  const [name, setName] = useState('');
  const [publicBaseUrl, setPublicBaseUrl] = useState('');
  const [values, setValues] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  const spec = useMemo(() => vm.providers.find((p) => p.id === providerId) || null, [vm.providers, providerId]);

  const openCreate = () => {
    setEditingId(null);
    setProviderId(vm.providers[0]?.id || '');
    setName('');
    setPublicBaseUrl('');
    setValues({});
    vm.clearTestResult();
    setIsFormOpen(true);
  };

  const openEdit = (config) => {
    setEditingId(config.id);
    setProviderId(config.provider);
    setName(config.name);
    setPublicBaseUrl(config.publicBaseUrl || '');
    // Prefill non-secret values; secrets stay masked until the user retypes them.
    setValues({
      ...config.params,
      bucket: config.bucket,
      region: config.region,
      endpoint: config.params?.endpoint || config.endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });
    vm.clearTestResult();
    setIsFormOpen(true);
  };

  const handleProviderChange = (id) => {
    setProviderId(id);
    setValues({});
    vm.clearTestResult();
  };

  const payload = () => ({ provider: providerId, name, publicBaseUrl, ...values });

  const handleSave = async () => {
    const result = await vm.save(payload(), editingId);
    // Stay open on a failed verification so the user can correct the values in place.
    if (result?.test?.ok) setIsFormOpen(false);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="max-w-xl">
          <h2 className="text-base font-semibold mb-1">Storage Integration</h2>
          <p className="text-ink-muted text-[13px] leading-relaxed">
            Connect an object-storage bucket to hold images, PDFs, and other assets for the File Manager. All
            supported providers speak the S3 API, so one connection is all that's needed. Credentials are
            encrypted before they're stored and are never sent back to this page in full.
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
          <HardDrive className="mx-auto text-accent-dim mb-3" size={26} />
          <div className="font-semibold text-[14px] mb-1">No storage connected yet</div>
          <p className="text-ink-muted text-[13px] max-w-md mx-auto mb-4">
            Add Amazon S3, Supabase Storage, Google Cloud Storage, Cloudflare R2, or any other S3-compatible
            bucket to start managing files.
          </p>
          <Button onClick={openCreate}>
            <Plus size={15} />
            Connect storage
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {vm.configs.map((config) => (
            <div
              key={config.id}
              className={`card flex items-start justify-between gap-4 ${
                config.isActive ? 'border-accent' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="font-semibold text-[14px]">{config.name}</span>
                  {config.isActive && (
                    <span className="badge badge-accent">
                      <CheckCircle2 size={10} />
                      Active
                    </span>
                  )}
                  <span className={`badge ${STATUS_BADGE[config.status] || ''}`}>{config.status}</span>
                </div>
                <div className="text-[12.5px] text-ink-muted font-mono truncate">
                  {config.provider} · {config.bucket} · {config.region}
                </div>
                {config.statusMessage && (
                  <div className="text-[12px] text-ink-muted mt-1.5">{config.statusMessage}</div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => vm.test(config.id)} title="Test connection">
                  <RefreshCw size={14} />
                </Button>
                {!config.isActive && (
                  <Button variant="secondary" size="sm" onClick={() => vm.activate(config.id)}>
                    <Zap size={13} />
                    Use this
                  </Button>
                )}
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
        title={editingId ? 'Edit storage provider' : 'Connect storage provider'}
        maxWidth="max-w-lg"
      >
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <Select
            label="Provider"
            options={vm.providers.map((p) => ({ value: p.id, label: p.label }))}
            value={providerId}
            disabled={Boolean(editingId)}
            onChange={(e) => handleProviderChange(e.target.value)}
          />
          <Input
            label="Display name"
            placeholder={spec?.label || 'Production assets'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            hint="What this connection is called inside EKIP."
          />

          <ProviderFieldForm spec={spec} values={values} onChange={(k, v) => setValues((c) => ({ ...c, [k]: v }))} />

          <Input
            label="Public base URL (optional)"
            placeholder="https://cdn.example.com"
            value={publicBaseUrl}
            onChange={(e) => setPublicBaseUrl(e.target.value)}
            hint="If the bucket is fronted by a CDN or public domain, files will link through it."
          />

          {editingId && (
            <p className="text-[12px] text-ink-muted mb-3">
              Leave a credential field on its masked value to keep the stored secret unchanged.
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
            {editingId ? 'Save changes' : 'Connect'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Remove this storage provider?"
      >
        <p className="text-[13px] text-ink-muted mb-5 leading-relaxed">
          This removes the saved credentials for <strong className="text-ink">{confirmDelete?.name}</strong> from
          EKIP. Nothing in the <span className="font-mono">{confirmDelete?.bucket}</span> bucket is deleted — the
          files stay exactly where they are and can be reconnected later.
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
