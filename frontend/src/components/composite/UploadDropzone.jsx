import { useState, useCallback } from 'react';
import { UploadCloud } from 'lucide-react';

const ACCEPTED_TYPES = ['.pdf', '.docx', '.txt', '.csv', '.pptx'];

export default function UploadDropzone({ onFileSelected, isUploading, progress }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-component p-7 text-center mb-4 ${
        isDragOver ? 'border-accent bg-accent-tint' : 'border-line bg-surface-raised'
      }`}
    >
      <UploadCloud className="mx-auto text-accent-dim" size={22} />
      {isUploading ? (
        <div className="mt-3">
          <div className="text-[13px] mb-2">Uploading… {progress}%</div>
          <div className="h-1.5 bg-line rounded-full overflow-hidden max-w-[200px] mx-auto">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <>
          <div className="text-[13px] mt-2">
            Drag and drop, or{' '}
            <label className="font-semibold text-accent cursor-pointer">
              browse
              <input
                type="file"
                className="hidden"
                accept={ACCEPTED_TYPES.join(',')}
                onChange={(e) => e.target.files?.[0] && onFileSelected(e.target.files[0])}
              />
            </label>
          </div>
          <div className="text-[11.5px] text-ink-muted mt-1">PDF, DOCX, TXT, CSV, PPTX · up to 50MB</div>
        </>
      )}
    </div>
  );
}
