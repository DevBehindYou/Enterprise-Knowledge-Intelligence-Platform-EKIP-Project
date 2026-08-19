import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload, FolderPlus, RefreshCw, Search, X, Grid3x3, List as ListIcon, ChevronRight,
  ArrowUp, Trash2, Pencil, Download, Scissors, Copy, ClipboardPaste, HardDrive,
  CheckSquare, Square, ArrowUpDown, Settings as SettingsIcon,
} from 'lucide-react';
import { useFileManagerViewModel } from '../viewmodels/useFileManagerViewModel.js';
import Button from '../components/foundations/Button.jsx';
import Input from '../components/foundations/Input.jsx';
import Select from '../components/foundations/Select.jsx';
import Modal from '../components/foundations/Modal.jsx';
import Skeleton from '../components/foundations/Skeleton.jsx';
import Toast from '../components/foundations/Toast.jsx';
import FileIcon from '../components/composite/FileIcon.jsx';
import FolderTree from '../components/composite/FolderTree.jsx';
import FilePreviewPanel from '../components/composite/FilePreviewPanel.jsx';
import { formatBytes, formatDate } from '../lib/formatBytes.js';

const KIND_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'image', label: 'Images' },
  { value: 'pdf', label: 'PDFs' },
  { value: 'document', label: 'Documents' },
  { value: 'spreadsheet', label: 'Spreadsheets' },
  { value: 'presentation', label: 'Presentations' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'archive', label: 'Archives' },
  { value: 'code', label: 'Code' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'modified', label: 'Last modified' },
  { value: 'kind', label: 'Type' },
];

/** Shown when no storage provider has been connected yet. */
function NotConfigured({ canConfigure }) {
  return (
    <div className="card text-center py-14 max-w-lg mx-auto mt-8">
      <HardDrive className="mx-auto text-accent-dim mb-3" size={28} />
      <h2 className="font-semibold text-[15px] mb-2">No storage connected yet</h2>
      <p className="text-ink-muted text-[13px] leading-relaxed mb-5">
        The File Manager stores images, PDFs, and other assets in an object-storage bucket.
        {canConfigure
          ? ' Connect Amazon S3, Supabase Storage, Google Cloud Storage, Cloudflare R2, or any S3-compatible provider to get started.'
          : ' Ask an administrator to connect a storage provider in Settings.'}
      </p>
      {canConfigure && (
        <Link to="/settings" className="btn-primary inline-flex">
          <SettingsIcon size={15} />
          Open Storage Integration
        </Link>
      )}
    </div>
  );
}

export default function FileManager() {
  const vm = useFileManagerViewModel();
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { canManage } = vm;

  /* ---- keyboard shortcuts ---- */
  useEffect(() => {
    const onKeyDown = (e) => {
      // Never hijack typing in a field.
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        setPreviewItem(null);
        vm.clearSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        vm.selectAll();
        return;
      }
      if (!canManage) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') vm.cut();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') vm.copy();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') vm.paste();
      if (e.key === 'Delete' && vm.selected.length) setIsDeleteOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [vm, canManage]);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!canManage) return;
      const dropped = e.dataTransfer?.files;
      if (dropped?.length) vm.upload(dropped);
    },
    [vm, canManage]
  );

  const openItem = (item, isFolder) => {
    if (isFolder) {
      setPreviewItem(null);
      vm.navigate(item.path);
    } else {
      setPreviewItem(item);
    }
  };

  const submitSearch = (e) => {
    e.preventDefault();
    vm.runGlobalSearch(vm.search, vm.kindFilter);
  };

  if (vm.status === null) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!vm.status.configured) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">File Manager</h1>
          <p className="text-ink-muted text-[13.5px] mt-1.5">
            Store and organize images, PDFs, and other assets for this workspace.
          </p>
        </div>
        <NotConfigured canConfigure={vm.status.canConfigure} />
      </div>
    );
  }

  const allVisible = vm.folders.length + vm.files.length;
  const allSelected = allVisible > 0 && vm.selected.length === allVisible;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* ---- header ---- */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">File Manager</h1>
            <p className="text-ink-muted text-[13px] mt-1">
              <span className="font-mono">{vm.status.bucket}</span> on {vm.status.provider}
              {vm.usage && (
                <>
                  {' · '}
                  {vm.usage.fileCount} file{vm.usage.fileCount === 1 ? '' : 's'} ·{' '}
                  {formatBytes(vm.usage.totalBytes)}
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={vm.refresh} title="Refresh">
              <RefreshCw size={14} />
            </Button>
            {canManage && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setIsNewFolderOpen(true)}>
                  <FolderPlus size={14} />
                  New folder
                </Button>
                <Button size="sm" onClick={() => fileInputRef.current?.click()} loading={vm.isUploading}>
                  <Upload size={14} />
                  {vm.isUploading ? `Uploading ${vm.uploadProgress}%` : 'Upload'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) vm.upload(e.target.files);
                    e.target.value = ''; // let the same file be picked again
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ---- toolbar ---- */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <form onSubmit={submitSearch} className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              className="input pl-9 pr-8"
              placeholder="Search this folder, or press Enter to search everywhere"
              value={vm.search}
              onChange={(e) => vm.setSearch(e.target.value)}
            />
            {(vm.search || vm.isGlobalSearch) && (
              <button
                type="button"
                onClick={vm.clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </form>

        <select
          className="input w-auto"
          value={vm.kindFilter}
          onChange={(e) => {
            vm.setKindFilter(e.target.value);
            if (vm.isGlobalSearch) vm.runGlobalSearch(vm.search, e.target.value);
          }}
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select className="input w-auto" value={vm.sortBy} onChange={(e) => vm.setSortBy(e.target.value)}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => vm.setSortDir(vm.sortDir === 'asc' ? 'desc' : 'asc')}
          title={vm.sortDir === 'asc' ? 'Ascending' : 'Descending'}
        >
          <ArrowUpDown size={14} />
          {vm.sortDir === 'asc' ? 'Asc' : 'Desc'}
        </Button>

        <div className="flex items-center border border-line rounded-component overflow-hidden">
          <button
            onClick={() => vm.setViewMode('grid')}
            className={`px-2.5 py-2 ${vm.viewMode === 'grid' ? 'bg-accent text-white' : 'text-ink-muted'}`}
            aria-label="Grid view"
          >
            <Grid3x3 size={14} />
          </button>
          <button
            onClick={() => vm.setViewMode('list')}
            className={`px-2.5 py-2 ${vm.viewMode === 'list' ? 'bg-accent text-white' : 'text-ink-muted'}`}
            aria-label="List view"
          >
            <ListIcon size={14} />
          </button>
        </div>
      </div>

      {/* ---- breadcrumbs + selection actions ---- */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3 min-h-[34px]">
        {vm.isGlobalSearch ? (
          <div className="text-[13px] text-ink-muted">
            Search results across all folders ·{' '}
            <button onClick={vm.clearSearch} className="text-accent font-semibold">
              back to {vm.path || 'All files'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[13px] flex-wrap">
            {vm.path && (
              <button onClick={vm.goUp} className="text-ink-muted hover:text-ink p-1" title="Up one level">
                <ArrowUp size={14} />
              </button>
            )}
            {vm.breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={13} className="text-ink-muted" />}
                <button
                  onClick={() => vm.navigate(crumb.path)}
                  className={
                    i === vm.breadcrumbs.length - 1 ? 'font-semibold' : 'text-ink-muted hover:text-ink'
                  }
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {allVisible > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (allSelected ? vm.clearSelection() : vm.selectAll())}
            >
              {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
              {allSelected ? 'Deselect all' : 'Select all'}
            </Button>
          )}

          {vm.selected.length > 0 && (
            <>
              <span className="text-[12.5px] text-ink-muted px-1">{vm.selected.length} selected</span>
              {vm.selected.length === 1 && !vm.selected[0].isFolder && (
                <Button variant="ghost" size="sm" onClick={() => vm.download(vm.selected[0])}>
                  <Download size={13} />
                  Download
                </Button>
              )}
              {canManage && (
                <>
                  {vm.selected.length === 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRenameTarget(vm.selected[0]);
                        setRenameValue(vm.selected[0].name);
                      }}
                    >
                      <Pencil size={13} />
                      Rename
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => vm.cut()}>
                    <Scissors size={13} />
                    Cut
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => vm.copy()}>
                    <Copy size={13} />
                    Copy
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsDeleteOpen(true)}>
                    <Trash2 size={13} className="text-danger" />
                    Delete
                  </Button>
                </>
              )}
            </>
          )}

          {canManage && vm.clipboard?.items?.length > 0 && !vm.isGlobalSearch && (
            <Button variant="secondary" size="sm" onClick={() => vm.paste()}>
              <ClipboardPaste size={13} />
              Paste {vm.clipboard.items.length} ({vm.clipboard.mode})
            </Button>
          )}
        </div>
      </div>

      {vm.error && (
        <div className="bg-danger-tint text-[#B3282C] text-[13px] p-3 rounded-component mb-3 flex items-start justify-between gap-3">
          <span>{vm.error}</span>
          <button onClick={() => vm.setError(null)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {vm.isUploading && (
        <div className="h-1 bg-line rounded-full overflow-hidden mb-3">
          <div className="h-full bg-accent transition-all" style={{ width: `${vm.uploadProgress}%` }} />
        </div>
      )}

      {/* ---- body: tree | content | preview ---- */}
      <div className="flex flex-1 min-h-0 border border-line rounded-component overflow-hidden bg-surface">
        {!vm.isGlobalSearch && <FolderTree tree={vm.tree} currentPath={vm.path} onNavigate={vm.navigate} />}

        <div
          className={`flex-1 overflow-y-auto p-4 relative ${isDragOver ? 'bg-accent-tint' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (canManage) setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          {isDragOver && (
            <div className="absolute inset-3 border-2 border-dashed border-accent rounded-component flex items-center justify-center pointer-events-none z-10 bg-accent-tint/80">
              <div className="text-[13.5px] font-semibold text-accent-dim flex items-center gap-2">
                <Upload size={16} />
                Drop files to upload to {vm.path || 'All files'}
              </div>
            </div>
          )}

          {vm.isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : allVisible === 0 ? (
            <div className="text-center py-16">
              <FileIcon kind="folder" size={28} className="mx-auto mb-3" />
              <div className="font-semibold text-[14px] mb-1">
                {vm.isGlobalSearch || vm.search ? 'Nothing matched that search' : 'This folder is empty'}
              </div>
              <p className="text-ink-muted text-[13px]">
                {vm.isGlobalSearch || vm.search
                  ? 'Try a different term, or clear the filters.'
                  : canManage
                    ? 'Drag files here, or use the Upload button to add the first one.'
                    : 'Files added by an administrator will appear here.'}
              </p>
            </div>
          ) : vm.viewMode === 'grid' ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {vm.folders.map((folder) => {
                const item = { path: folder.path, name: folder.name, isFolder: true };
                return (
                  <button
                    key={folder.path}
                    onClick={(e) => vm.toggleSelect(item, e.ctrlKey || e.metaKey)}
                    onDoubleClick={() => openItem(folder, true)}
                    className={`card-flat text-left border hover:border-accent transition-colors ${
                      vm.isSelected(folder.path) ? 'border-accent bg-accent-tint' : 'border-line'
                    }`}
                  >
                    <FileIcon kind="folder" size={26} className="mb-2" />
                    <div className="text-[13px] font-medium truncate">{folder.name}</div>
                    <div className="text-[11.5px] text-ink-muted">Folder</div>
                  </button>
                );
              })}

              {vm.files.map((file) => {
                const item = { path: file.path, name: file.name, isFolder: false, kind: file.kind, size: file.size, lastModified: file.lastModified };
                return (
                  <button
                    key={file.path}
                    onClick={(e) => vm.toggleSelect(item, e.ctrlKey || e.metaKey)}
                    onDoubleClick={() => openItem(item, false)}
                    className={`card-flat text-left border hover:border-accent transition-colors ${
                      vm.isSelected(file.path) ? 'border-accent bg-accent-tint' : 'border-line'
                    }`}
                  >
                    <FileIcon kind={file.kind} size={26} className="mb-2" />
                    <div className="text-[13px] font-medium truncate" title={file.name}>
                      {file.name}
                    </div>
                    <div className="text-[11.5px] text-ink-muted">
                      {formatBytes(file.size)} · {formatDate(file.lastModified)}
                    </div>
                    {vm.isGlobalSearch && file.folder && (
                      <div className="text-[11px] text-ink-muted font-mono truncate mt-0.5">in {file.folder || '/'}</div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase">
                  <th className="pb-2.5 border-b border-line">Name</th>
                  <th className="pb-2.5 border-b border-line w-24">Size</th>
                  <th className="pb-2.5 border-b border-line w-28">Type</th>
                  <th className="pb-2.5 border-b border-line w-32">Modified</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {vm.folders.map((folder) => {
                  const item = { path: folder.path, name: folder.name, isFolder: true };
                  return (
                    <tr
                      key={folder.path}
                      onClick={(e) => vm.toggleSelect(item, e.ctrlKey || e.metaKey)}
                      onDoubleClick={() => openItem(folder, true)}
                      className={`cursor-pointer ${vm.isSelected(folder.path) ? 'bg-accent-tint' : 'hover:bg-black/[0.02]'}`}
                    >
                      <td className="py-2.5 border-b border-line">
                        <span className="flex items-center gap-2">
                          <FileIcon kind="folder" size={16} />
                          <span className="truncate font-medium">{folder.name}</span>
                        </span>
                      </td>
                      <td className="py-2.5 border-b border-line text-ink-muted">—</td>
                      <td className="py-2.5 border-b border-line text-ink-muted">Folder</td>
                      <td className="py-2.5 border-b border-line text-ink-muted">—</td>
                    </tr>
                  );
                })}

                {vm.files.map((file) => {
                  const item = { path: file.path, name: file.name, isFolder: false, kind: file.kind, size: file.size, lastModified: file.lastModified };
                  return (
                    <tr
                      key={file.path}
                      onClick={(e) => vm.toggleSelect(item, e.ctrlKey || e.metaKey)}
                      onDoubleClick={() => openItem(item, false)}
                      className={`cursor-pointer ${vm.isSelected(file.path) ? 'bg-accent-tint' : 'hover:bg-black/[0.02]'}`}
                    >
                      <td className="py-2.5 border-b border-line">
                        <span className="flex items-center gap-2 min-w-0">
                          <FileIcon kind={file.kind} size={16} />
                          <span className="truncate" title={file.path}>
                            {vm.isGlobalSearch ? file.path : file.name}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 border-b border-line text-ink-muted">{formatBytes(file.size)}</td>
                      <td className="py-2.5 border-b border-line text-ink-muted">{file.kind}</td>
                      <td className="py-2.5 border-b border-line text-ink-muted">{formatDate(file.lastModified)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {previewItem && (
          <FilePreviewPanel
            item={previewItem}
            onClose={() => setPreviewItem(null)}
            onDownload={vm.download}
            getPreviewUrl={vm.getPreviewUrl}
            getTextContent={vm.getTextContent}
            getDetails={vm.getDetails}
          />
        )}
      </div>

      <div className="text-[11.5px] text-ink-muted mt-2">
        Click to select · Ctrl/Cmd-click for multiple · double-click to open
        {canManage && ' · Ctrl+X / Ctrl+C / Ctrl+V to move and copy · Delete to remove'}
      </div>

      {/* ---- modals ---- */}
      <Modal isOpen={isNewFolderOpen} onClose={() => setIsNewFolderOpen(false)} title="New folder">
        <Input
          label="Folder name"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="brand-assets"
          hint={`Will be created in ${vm.path || 'All files'}.`}
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setIsNewFolderOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!newFolderName.trim()}
            onClick={async () => {
              if (await vm.createFolder(newFolderName.trim())) {
                setNewFolderName('');
                setIsNewFolderOpen(false);
              }
            }}
          >
            Create folder
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title={`Rename ${renameTarget?.isFolder ? 'folder' : 'file'}`}
      >
        <Input
          label="New name"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          autoFocus
          hint={
            renameTarget?.isFolder
              ? 'Renaming a folder rewrites the path of everything inside it, which can take a moment.'
              : undefined
          }
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setRenameTarget(null)}>
            Cancel
          </Button>
          <Button
            disabled={!renameValue.trim() || renameValue.trim() === renameTarget?.name}
            onClick={async () => {
              if (await vm.rename(renameTarget, renameValue.trim())) {
                setRenameTarget(null);
                setPreviewItem(null);
              }
            }}
          >
            Rename
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title={`Delete ${vm.selected.length} item${vm.selected.length === 1 ? '' : 's'}?`}
      >
        <p className="text-[13px] text-ink-muted mb-3 leading-relaxed">
          This permanently removes the selected {vm.selected.length === 1 ? 'item' : 'items'} from{' '}
          <span className="font-mono">{vm.status.bucket}</span>. It cannot be undone from here.
        </p>
        {vm.selected.some((s) => s.isFolder) && (
          <p className="text-[13px] text-[#B3282C] bg-danger-tint p-3 rounded-component mb-3">
            Your selection includes a folder — everything inside it will be deleted too.
          </p>
        )}
        <ul className="text-[12.5px] font-mono max-h-32 overflow-y-auto mb-5 flex flex-col gap-1">
          {vm.selected.slice(0, 20).map((s) => (
            <li key={s.path} className="truncate text-ink-muted">
              {s.path}
            </li>
          ))}
          {vm.selected.length > 20 && (
            <li className="text-ink-muted">…and {vm.selected.length - 20} more</li>
          )}
        </ul>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await vm.remove();
              setIsDeleteOpen(false);
              setPreviewItem(null);
            }}
          >
            Delete permanently
          </Button>
        </div>
      </Modal>

      {vm.notice && <Toast message={vm.notice} onDismiss={() => vm.setNotice(null)} />}
    </div>
  );
}
