import { useState, useEffect, useCallback, useMemo } from 'react';
import { fileManagerService } from '../services/fileManagerService.js';

const readError = (err, fallback) => err.response?.data?.error?.message || fallback;

/**
 * Drives the File Manager page: navigation, selection, and every mutation.
 * Kept free of JSX so the page stays a pure view over this state (MVVM, docs/07).
 */
export function useFileManagerViewModel() {
  const [status, setStatus] = useState(null); // null until the storage check resolves
  const [path, setPath] = useState('');
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [tree, setTree] = useState(null);
  const [usage, setUsage] = useState(null);

  const [search, setSearch] = useState('');
  const [globalResults, setGlobalResults] = useState(null); // non-null while showing a recursive search
  const [kindFilter, setKindFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [viewMode, setViewMode] = useState('grid');

  const [selected, setSelected] = useState([]); // [{ path, name, isFolder }]
  const [clipboard, setClipboard] = useState(null); // { items, mode }

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const canManage = status?.canConfigure ?? false;

  /* ---------------- loading ---------------- */

  const loadStatus = useCallback(async () => {
    try {
      const result = await fileManagerService.getStatus();
      setStatus(result);
      return result;
    } catch (err) {
      setError(readError(err, 'Could not check storage status.'));
      setStatus({ configured: false, canConfigure: false });
      return null;
    }
  }, []);

  const loadFolder = useCallback(
    async (targetPath = path) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fileManagerService.list({ path: targetPath, sortBy, sortDir });
        setFolders(result.folders);
        setFiles(result.files);
        setPath(result.path);
      } catch (err) {
        // A 409 means storage was never configured — that's a setup state the
        // page renders as guidance, not a red error banner.
        if (err.response?.data?.error?.code === 'STORAGE_NOT_CONFIGURED') {
          setStatus((s) => ({ ...(s || {}), configured: false }));
        } else {
          setError(readError(err, 'Could not load this folder.'));
        }
        setFolders([]);
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    },
    [path, sortBy, sortDir]
  );

  const loadTree = useCallback(async () => {
    try {
      setTree(await fileManagerService.tree());
    } catch {
      setTree(null); // the tree is a convenience; failing it shouldn't break the page
    }
  }, []);

  const loadUsage = useCallback(async () => {
    try {
      setUsage(await fileManagerService.usage());
    } catch {
      setUsage(null);
    }
  }, []);

  // Initial mount: check storage, then load the root if it's connected.
  useEffect(() => {
    (async () => {
      const result = await loadStatus();
      if (result?.configured) {
        await Promise.all([loadFolder(''), loadTree(), loadUsage()]);
      } else {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sort server-side when the sort controls change.
  useEffect(() => {
    if (status?.configured && !globalResults) loadFolder(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortDir]);

  /* ---------------- navigation ---------------- */

  const navigate = useCallback(
    async (targetPath) => {
      setSelected([]);
      setGlobalResults(null);
      setSearch('');
      await loadFolder(targetPath);
    },
    [loadFolder]
  );

  const breadcrumbs = useMemo(() => {
    const crumbs = [{ name: 'All files', path: '' }];
    let accumulated = '';
    for (const segment of path.split('/').filter(Boolean)) {
      accumulated = accumulated ? `${accumulated}/${segment}` : segment;
      crumbs.push({ name: segment, path: accumulated });
    }
    return crumbs;
  }, [path]);

  const goUp = useCallback(() => {
    const parent = path.split('/').slice(0, -1).join('/');
    navigate(parent);
  }, [path, navigate]);

  /* ---------------- search ---------------- */

  /** Recursive search across the whole bucket, as opposed to filtering one folder. */
  const runGlobalSearch = useCallback(
    async (query, kind = kindFilter) => {
      if (!query?.trim() && !kind) {
        setGlobalResults(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const result = await fileManagerService.search({ q: query, kind });
        setGlobalResults(result);
      } catch (err) {
        setError(readError(err, 'Search failed.'));
      } finally {
        setIsLoading(false);
      }
    },
    [kindFilter]
  );

  const clearSearch = useCallback(() => {
    setSearch('');
    setKindFilter('');
    setGlobalResults(null);
  }, []);

  /** Client-side filter of the current folder, used while not in global-search mode. */
  const visibleFolders = useMemo(() => {
    if (globalResults) return [];
    const term = search.trim().toLowerCase();
    return term ? folders.filter((f) => f.name.toLowerCase().includes(term)) : folders;
  }, [folders, search, globalResults]);

  const visibleFiles = useMemo(() => {
    if (globalResults) return globalResults.items;
    const term = search.trim().toLowerCase();
    let list = term ? files.filter((f) => f.name.toLowerCase().includes(term)) : files;
    if (kindFilter) list = list.filter((f) => f.kind === kindFilter);
    return list;
  }, [files, search, kindFilter, globalResults]);

  /* ---------------- selection ---------------- */

  const isSelected = useCallback(
    (itemPath) => selected.some((s) => s.path === itemPath),
    [selected]
  );

  const toggleSelect = useCallback((item, additive = false) => {
    setSelected((current) => {
      const exists = current.some((s) => s.path === item.path);
      if (additive) {
        return exists ? current.filter((s) => s.path !== item.path) : [...current, item];
      }
      return exists && current.length === 1 ? [] : [item];
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected([
      ...visibleFolders.map((f) => ({ path: f.path, name: f.name, isFolder: true })),
      ...visibleFiles.map((f) => ({ path: f.path, name: f.name, isFolder: false })),
    ]);
  }, [visibleFolders, visibleFiles]);

  const clearSelection = useCallback(() => setSelected([]), []);

  /* ---------------- mutations ---------------- */

  const refresh = useCallback(async () => {
    await Promise.all([loadFolder(path), loadTree(), loadUsage()]);
  }, [loadFolder, path, loadTree, loadUsage]);

  const upload = useCallback(
    async (fileList) => {
      if (!fileList?.length) return;
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      try {
        const result = await fileManagerService.upload(fileList, path, setUploadProgress);
        if (result.failed?.length) {
          setError(
            `${result.failed.length} file${result.failed.length === 1 ? '' : 's'} could not be uploaded: ` +
              result.failed.map((f) => `${f.name} (${f.message})`).join('; ')
          );
        }
        if (result.uploaded?.length) {
          setNotice(
            `Uploaded ${result.uploaded.length} file${result.uploaded.length === 1 ? '' : 's'}.`
          );
        }
        await refresh();
        return result;
      } catch (err) {
        setError(readError(err, 'Upload failed.'));
        return null;
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [path, refresh]
  );

  const createFolder = useCallback(
    async (name) => {
      setError(null);
      try {
        await fileManagerService.createFolder(path, name);
        setNotice(`Created folder "${name}".`);
        await refresh();
        return true;
      } catch (err) {
        setError(readError(err, 'Could not create the folder.'));
        return false;
      }
    },
    [path, refresh]
  );

  const rename = useCallback(
    async (item, newName) => {
      setError(null);
      try {
        await fileManagerService.rename(item.path, newName, item.isFolder);
        setNotice(`Renamed to "${newName}".`);
        setSelected([]);
        await refresh();
        return true;
      } catch (err) {
        setError(readError(err, 'Could not rename this item.'));
        return false;
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (items = selected) => {
      if (!items.length) return false;
      setError(null);
      try {
        const result = await fileManagerService.remove({
          paths: items.filter((i) => !i.isFolder).map((i) => i.path),
          folderPaths: items.filter((i) => i.isFolder).map((i) => i.path),
        });
        setNotice(`Deleted ${result.deleted} object${result.deleted === 1 ? '' : 's'}.`);
        setSelected([]);
        await refresh();
        return true;
      } catch (err) {
        setError(readError(err, 'Could not delete the selected items.'));
        return false;
      }
    },
    [selected, refresh]
  );

  const cut = useCallback(
    (items = selected) => {
      if (items.length) {
        setClipboard({ items, mode: 'move' });
        setNotice(`${items.length} item${items.length === 1 ? '' : 's'} ready to move. Open a folder and choose Paste.`);
      }
    },
    [selected]
  );

  const copy = useCallback(
    (items = selected) => {
      if (items.length) {
        setClipboard({ items, mode: 'copy' });
        setNotice(`${items.length} item${items.length === 1 ? '' : 's'} ready to copy. Open a folder and choose Paste.`);
      }
    },
    [selected]
  );

  const paste = useCallback(
    async (destination = path) => {
      if (!clipboard?.items?.length) return false;
      setError(null);
      try {
        const result = await fileManagerService.move(
          clipboard.items.map((i) => ({ path: i.path, isFolder: i.isFolder })),
          destination,
          clipboard.mode
        );
        if (result.failed?.length) {
          setError(result.failed.map((f) => `${f.path}: ${f.message}`).join('; '));
        } else {
          setNotice(clipboard.mode === 'copy' ? 'Copied.' : 'Moved.');
        }
        setClipboard(null);
        setSelected([]);
        await refresh();
        return true;
      } catch (err) {
        setError(readError(err, 'Could not complete the operation.'));
        return false;
      }
    },
    [clipboard, path, refresh]
  );

  /** Drag-and-drop a selection onto a folder row. */
  const moveInto = useCallback(
    async (items, destination) => {
      setError(null);
      try {
        const result = await fileManagerService.move(
          items.map((i) => ({ path: i.path, isFolder: i.isFolder })),
          destination,
          'move'
        );
        if (result.failed?.length) {
          setError(result.failed.map((f) => `${f.path}: ${f.message}`).join('; '));
        } else {
          setNotice(`Moved ${items.length} item${items.length === 1 ? '' : 's'}.`);
        }
        setSelected([]);
        await refresh();
        return true;
      } catch (err) {
        setError(readError(err, 'Could not move the items.'));
        return false;
      }
    },
    [refresh]
  );

  const download = useCallback(async (item) => {
    setError(null);
    try {
      const { url } = await fileManagerService.signedUrl(item.path, { download: true });
      // Presigned URL — the browser fetches straight from the storage provider.
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    } catch (err) {
      setError(readError(err, 'Could not generate a download link.'));
      return false;
    }
  }, []);

  const getPreviewUrl = useCallback(async (item) => {
    const { url } = await fileManagerService.signedUrl(item.path, { expiresIn: 900 });
    return url;
  }, []);

  const getTextContent = useCallback((item) => fileManagerService.rawText(item.path), []);

  const getDetails = useCallback((item) => fileManagerService.stat(item.path), []);

  return {
    // state
    status,
    path,
    breadcrumbs,
    tree,
    usage,
    folders: visibleFolders,
    files: visibleFiles,
    isGlobalSearch: Boolean(globalResults),
    search,
    kindFilter,
    sortBy,
    sortDir,
    viewMode,
    selected,
    clipboard,
    isLoading,
    isUploading,
    uploadProgress,
    error,
    notice,
    canManage,

    // setters
    setSearch,
    setKindFilter,
    setSortBy,
    setSortDir,
    setViewMode,
    setError,
    setNotice,

    // actions
    navigate,
    goUp,
    refresh,
    reloadStatus: loadStatus,
    runGlobalSearch,
    clearSearch,
    isSelected,
    toggleSelect,
    selectAll,
    clearSelection,
    upload,
    createFolder,
    rename,
    remove,
    cut,
    copy,
    paste,
    moveInto,
    download,
    getPreviewUrl,
    getTextContent,
    getDetails,
  };
}
