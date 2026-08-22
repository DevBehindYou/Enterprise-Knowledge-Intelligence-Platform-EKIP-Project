import { useState, useEffect } from 'react';
import { X, Download, ExternalLink, Copy, Check } from 'lucide-react';
import Button from '../foundations/Button.jsx';
import Skeleton from '../foundations/Skeleton.jsx';
import FileIcon from './FileIcon.jsx';
import { formatBytes, formatDate } from '../../lib/formatBytes.js';

const TEXT_PREVIEW_LIMIT = 200 * 1024; // don't stream a 40MB log file into the DOM

/**
 * Right-rail preview for the selected file. Images/video/audio/PDF render from a
 * short-lived presigned URL (bytes go browser → provider, never through the API);
 * text and code are streamed through the API so they can be shown inline.
 */
export default function FilePreviewPanel({ item, onClose, onDownload, getPreviewUrl, getTextContent, getDetails }) {
  const [details, setDetails] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    setPreviewUrl(null);
    setTextContent(null);
    setDetails(null);
    setCopied(false);

    (async () => {
      try {
        const stat = await getDetails(item);
        if (cancelled) return;
        setDetails(stat);

        const isRenderable = ['image', 'video', 'audio', 'pdf'].includes(stat.kind);
        const isText = ['text', 'code', 'document'].includes(stat.kind) || stat.mimeType?.startsWith('text/');

        if (isRenderable) {
          const url = await getPreviewUrl(item);
          if (!cancelled) setPreviewUrl(url);
        } else if (isText && stat.size <= TEXT_PREVIEW_LIMIT) {
          const content = await getTextContent(item);
          if (!cancelled) setTextContent(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error?.message || 'Could not load this preview.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item, getDetails, getPreviewUrl, getTextContent]);

  if (!item) return null;

  const kind = details?.kind || item.kind;

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(item.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to the clipboard.');
    }
  };

  return (
    // Below lg the content pane is too narrow to sit beside a 320px rail, so the
    // preview becomes a full-height overlay drawer (closed via its X); at lg+ it's
    // the static right rail.
    <aside className="fixed inset-0 z-40 w-full border-l border-line bg-surface-raised flex flex-col h-full overflow-hidden shadow-2xl lg:static lg:inset-auto lg:z-auto lg:w-[320px] lg:shrink-0 lg:shadow-none">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-line">
        <span className="text-[13px] font-semibold truncate">Details</span>
        <button onClick={onClose} className="text-ink-muted hover:text-ink p-1" aria-label="Close details">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-start gap-2.5 mb-4">
          <FileIcon kind={kind} size={24} />
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold break-words leading-snug">{item.name}</div>
            <div className="text-[12px] text-ink-muted mt-0.5">
              {formatBytes(details?.size ?? item.size)} · {kind}
            </div>
          </div>
        </div>

        {error && <div className="bg-danger-tint text-[#B3282C] text-[12.5px] p-2.5 rounded-component mb-3">{error}</div>}

        {/* ---- preview surface ---- */}
        <div className="mb-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : previewUrl && kind === 'image' ? (
            <img
              src={previewUrl}
              alt={item.name}
              className="w-full rounded-component border border-line bg-surface object-contain max-h-64"
            />
          ) : previewUrl && kind === 'video' ? (
            <video src={previewUrl} controls className="w-full rounded-component border border-line" />
          ) : previewUrl && kind === 'audio' ? (
            <audio src={previewUrl} controls className="w-full" />
          ) : previewUrl && kind === 'pdf' ? (
            <div className="rounded-component border border-line overflow-hidden bg-surface">
              <iframe src={previewUrl} title={item.name} className="w-full h-64" />
            </div>
          ) : textContent !== null ? (
            <pre className="text-[11.5px] font-mono bg-surface border border-line rounded-component p-3 max-h-64 overflow-auto whitespace-pre-wrap break-words">
              {textContent}
            </pre>
          ) : (
            <div className="text-[12.5px] text-ink-muted bg-surface border border-line rounded-component p-4 text-center">
              No inline preview for this file type. Download it to open.
            </div>
          )}
        </div>

        {/* ---- metadata ---- */}
        <dl className="text-[12.5px] flex flex-col gap-2.5 mb-4">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Modified</dt>
            <dd className="text-right">{formatDate(details?.lastModified ?? item.lastModified)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Size</dt>
            <dd className="text-right">{formatBytes(details?.size ?? item.size)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Type</dt>
            <dd className="text-right font-mono text-[11.5px] break-all">{details?.mimeType || '—'}</dd>
          </div>
          {details?.etag && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">ETag</dt>
              <dd className="text-right font-mono text-[11px] break-all">{details.etag}</dd>
            </div>
          )}
          <div>
            <dt className="text-ink-muted mb-1">Path</dt>
            <dd className="font-mono text-[11.5px] break-all bg-surface border border-line rounded p-2">
              {item.path}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2">
          <Button variant="secondary" size="sm" onClick={() => onDownload(item)} className="justify-center">
            <Download size={13} />
            Download
          </Button>
          <Button variant="ghost" size="sm" onClick={copyPath} className="justify-center">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Path copied' : 'Copy path'}
          </Button>
          {details?.publicUrl && (
            <a
              href={details.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs px-3 py-1.5 justify-center"
            >
              <ExternalLink size={13} />
              Open public URL
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
