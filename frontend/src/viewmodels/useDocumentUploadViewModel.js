import { useState, useCallback } from 'react';
import { documentService } from '../services/documentService.js';

export function useDocumentUploadViewModel(onUploaded) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const upload = useCallback(
    async ({ file, department, securityLevel, tags, allowedRoles }) => {
      setError(null);
      setIsUploading(true);
      setProgress(0);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('department', department);
        formData.append('securityLevel', securityLevel);
        (tags || []).forEach((t) => formData.append('tags', t));
        (allowedRoles || []).forEach((r) => formData.append('allowedRoles', r));

        const result = await documentService.upload(formData, (evt) => {
          setProgress(Math.round((evt.loaded / evt.total) * 100));
        });
        onUploaded?.(result);
        return result;
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Upload failed. Please try again.');
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [onUploaded]
  );

  return { isUploading, progress, error, upload };
}
