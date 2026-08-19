import { apiClient } from '../lib/apiClient.js';

export const fileManagerService = {
  async getStatus() {
    const { data } = await apiClient.get('/files/status');
    return data;
  },
  async list({ path = '', search = '', sortBy = 'name', sortDir = 'asc' } = {}) {
    const { data } = await apiClient.get('/files', { params: { path, search, sortBy, sortDir } });
    return data;
  },
  async tree() {
    const { data } = await apiClient.get('/files/tree');
    return data;
  },
  async search({ q, kind = '', limit = 300 }) {
    const { data } = await apiClient.get('/files/search', { params: { q, kind, limit } });
    return data;
  },
  async usage() {
    const { data } = await apiClient.get('/files/usage');
    return data;
  },
  async stat(path) {
    const { data } = await apiClient.get('/files/stat', { params: { path } });
    return data;
  },
  async signedUrl(path, { download = false, expiresIn = 900 } = {}) {
    const { data } = await apiClient.get('/files/signed-url', { params: { path, download, expiresIn } });
    return data;
  },
  /** Inline preview for text/code — streamed through the API as plain text. */
  async rawText(path) {
    const { data } = await apiClient.get('/files/raw', { params: { path }, responseType: 'text' });
    return data;
  },
  async upload(files, path = '', onProgress) {
    const formData = new FormData();
    [...files].forEach((f) => formData.append('files', f));
    formData.append('path', path);
    const { data } = await apiClient.post('/files/upload', formData, {
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    });
    return data;
  },
  async createFolder(path, name) {
    const { data } = await apiClient.post('/files/folder', { path, name });
    return data;
  },
  async rename(path, name, isFolder = false) {
    const { data } = await apiClient.patch('/files/rename', { path, name, isFolder });
    return data;
  },
  async move(items, destination, mode = 'move') {
    const { data } = await apiClient.post('/files/move', { items, destination, mode });
    return data;
  },
  async remove({ paths = [], folderPaths = [] }) {
    const { data } = await apiClient.post('/files/delete', { paths, folderPaths });
    return data;
  },
};
