import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useDocumentLibraryViewModel } from '../../viewmodels/useDocumentLibraryViewModel.js';
import { useDocumentUploadViewModel } from '../../viewmodels/useDocumentUploadViewModel.js';
import { documentService } from '../../services/documentService.js';
import Table from '../../components/foundations/Table.jsx';
import Button from '../../components/foundations/Button.jsx';
import { useDialog } from '../../context/DialogContext.jsx';
import Modal from '../../components/foundations/Modal.jsx';
import Select from '../../components/foundations/Select.jsx';
import Input from '../../components/foundations/Input.jsx';
import UploadDropzone from '../../components/composite/UploadDropzone.jsx';
import StatusBadge from '../../components/composite/StatusBadge.jsx';
import Badge from '../../components/foundations/Badge.jsx';

const LEVEL_VARIANT = { public: 'success', internal: 'accent', confidential: 'warning', restricted: 'danger' };

export default function AdminDocuments() {
  const { confirm } = useDialog();
  const { documents, isLoading, reload } = useDocumentLibraryViewModel();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [meta, setMeta] = useState({ department: 'HR', securityLevel: 'internal', tags: '' });
  const [pendingFile, setPendingFile] = useState(null);
  const navigate = useNavigate();

  const { isUploading, progress, upload } = useDocumentUploadViewModel(() => {
    setIsUploadOpen(false);
    setPendingFile(null);
    reload();
  });

  const onFileSelected = useCallback((file) => setPendingFile(file), []);

  async function submitUpload(e) {
    e.preventDefault();
    if (!pendingFile) return;
    await upload({
      file: pendingFile,
      department: meta.department,
      securityLevel: meta.securityLevel,
      tags: meta.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  }

  async function reprocess(id) {
    await documentService.reprocess(id);
    reload();
  }
  async function remove(id, name) {
    const ok = await confirm({
      title: 'Delete document',
      message: `Are you sure you want to permanently delete ${name || 'this document'}? This will remove all chunks and vector embeddings.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!ok) return;
    await documentService.remove(id);
    reload();
  }

  const columns = [
    {
      key: 'originalName',
      label: 'Document',
      render: (row) => (
        <button className="font-semibold text-left" onClick={() => navigate(`/documents/${row._id}`)}>
          {row.originalName}
        </button>
      ),
    },
    { key: 'department', label: 'Department' },
    { key: 'securityLevel', label: 'Security level', render: (row) => <Badge variant={LEVEL_VARIANT[row.securityLevel]}>{row.securityLevel}</Badge> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'updatedAt', label: 'Updated', render: (row) => new Date(row.updatedAt).toLocaleDateString() },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <button className="btn-ghost !p-1.5" onClick={() => reprocess(row._id)} title="Reprocess">
            <RefreshCw size={15} />
          </button>
          <button className="btn-ghost !p-1.5 !text-danger" onClick={() => remove(row._id, row.originalName)} title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Document management</h1>
          <p className="text-ink-muted text-[13.5px] mt-1.5">{documents.length} documents.</p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)}>Upload document</Button>
      </div>

      <div className="card !p-0 overflow-hidden">
        {isLoading ? <div className="p-6 text-ink-muted text-sm">Loading…</div> : <Table columns={columns} rows={documents} />}
      </div>

      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload document">
        <form onSubmit={submitUpload}>
          <UploadDropzone onFileSelected={onFileSelected} isUploading={isUploading} progress={progress} />
          {pendingFile && <div className="text-[12.5px] text-ink-muted mb-4">Selected: {pendingFile.name}</div>}
          <Select label="Department" value={meta.department} onChange={(e) => setMeta({ ...meta, department: e.target.value })} options={['HR', 'Finance', 'Engineering', 'Legal', 'IT']} />
          <Select
            label="Security level"
            value={meta.securityLevel}
            onChange={(e) => setMeta({ ...meta, securityLevel: e.target.value })}
            options={['public', 'internal', 'confidential', 'restricted']}
          />
          <Input label="Tags (comma-separated)" value={meta.tags} onChange={(e) => setMeta({ ...meta, tags: e.target.value })} placeholder="travel, reimbursement" />
          <div className="flex gap-2.5 justify-end mt-2">
            <Button type="button" variant="secondary" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isUploading} disabled={!pendingFile}>
              Upload &amp; process
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
