import * as fm from '../services/storage/fileManagerService.js';
import StorageConfig from '../models/StorageConfig.js';
import { writeAudit } from '../middleware/auditWrite.js';

/**
 * File Manager API (/api/files).
 *
 * Read operations are open to any authenticated user; every mutation is
 * admin-only, enforced at the route layer. The tenant prefix is always taken
 * from req.user, never from the request, so one tenant can't address another's
 * objects even with a hand-crafted path.
 */
export const filesController = {
  /** Whether a provider is connected — lets the UI show setup guidance instead of an error. */
  async status(req, res, next) {
    try {
      const active = await StorageConfig.findOne({ tenantId: req.user.tenantId, isActive: true });
      if (!active) {
        return res.status(200).json({
          configured: false,
          message: 'No storage provider is connected yet.',
          canConfigure: req.user.role === 'admin',
        });
      }
      res.status(200).json({
        configured: true,
        provider: active.provider,
        name: active.name,
        bucket: active.bucket,
        region: active.region,
        status: active.status,
        statusMessage: active.statusMessage,
        canConfigure: req.user.role === 'admin',
      });
    } catch (err) {
      next(err);
    }
  },

  async list(req, res, next) {
    try {
      const { path: folderPath = '', search = '', sortBy = 'name', sortDir = 'asc' } = req.query;
      const result = await fm.listFolder({
        tenantId: req.user.tenantId,
        prefix: folderPath,
        search,
        sortBy,
        sortDir,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async tree(req, res, next) {
    try {
      const tree = await fm.folderTree({ tenantId: req.user.tenantId });
      res.status(200).json(tree);
    } catch (err) {
      next(err);
    }
  },

  async search(req, res, next) {
    try {
      const { q = '', kind = '', limit } = req.query;
      const result = await fm.searchAll({
        tenantId: req.user.tenantId,
        query: q,
        kind,
        limit: Math.min(Number(limit) || 300, 1000),
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async usage(req, res, next) {
    try {
      res.status(200).json(await fm.usageStats({ tenantId: req.user.tenantId }));
    } catch (err) {
      next(err);
    }
  },

  async stat(req, res, next) {
    try {
      const { path: filePath } = req.query;
      if (!filePath) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'path is required.' } });
      }
      res.status(200).json(await fm.statFile({ tenantId: req.user.tenantId, filePath }));
    } catch (err) {
      next(err);
    }
  },

  /** Presigned GET — the UI uses this for both preview and download. */
  async signedUrl(req, res, next) {
    try {
      const { path: filePath, download, expiresIn } = req.query;
      if (!filePath) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'path is required.' } });
      }
      const result = await fm.signedUrlFor({
        tenantId: req.user.tenantId,
        filePath,
        download: download === 'true' || download === '1',
        expiresIn: Number(expiresIn) || 900,
      });
      if (download === 'true' || download === '1') {
        await writeAudit({
          req,
          action: 'file.download',
          targetType: 'file',
          targetId: null,
          metadata: { path: result.path },
        });
      }
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /** Streams bytes through the API — used for inline preview of text/code files. */
  async raw(req, res, next) {
    try {
      const { path: filePath } = req.query;
      if (!filePath) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'path is required.' } });
      }
      const { stream, contentType, contentLength, name } = await fm.readFileStream({
        tenantId: req.user.tenantId,
        filePath,
      });
      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(name)}"`);
      stream.on('error', next);
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  },

  /* ---------------- mutations (admin only, per routes) ---------------- */

  async upload(req, res, next) {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'At least one file is required.' } });
      }
      const folderPath = req.body.path || '';

      const uploaded = [];
      const failed = [];
      for (const file of files) {
        try {
          uploaded.push(
            await fm.uploadFile({
              tenantId: req.user.tenantId,
              folderPath,
              filename: file.originalname,
              buffer: file.buffer,
              mimeType: file.mimetype,
            })
          );
        } catch (err) {
          // One bad file in a multi-file drop shouldn't discard the rest.
          failed.push({ name: file.originalname, message: err.message });
        }
      }

      await writeAudit({
        req,
        action: 'file.upload',
        targetType: 'file',
        targetId: null,
        metadata: { folder: folderPath, count: uploaded.length, failed: failed.length },
      });

      res.status(uploaded.length ? 201 : 400).json({ uploaded, failed });
    } catch (err) {
      next(err);
    }
  },

  /** Presigned PUT so big files skip the API tier entirely. */
  async signUpload(req, res, next) {
    try {
      const { path: folderPath = '', filename } = req.body;
      if (!filename) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'filename is required.' } });
      }
      res.status(200).json(await fm.signedUploadUrl({ tenantId: req.user.tenantId, folderPath, filename }));
    } catch (err) {
      next(err);
    }
  },

  async createFolder(req, res, next) {
    try {
      const { path: parentPath = '', name } = req.body;
      if (!name) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name is required.' } });
      }
      const folder = await fm.createFolder({ tenantId: req.user.tenantId, parentPath, name });
      await writeAudit({
        req,
        action: 'file.folder_create',
        targetType: 'file',
        targetId: null,
        metadata: { path: folder.path },
      });
      res.status(201).json(folder);
    } catch (err) {
      next(err);
    }
  },

  async rename(req, res, next) {
    try {
      const { path: targetPath, name, isFolder = false } = req.body;
      if (!targetPath || !name) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'path and name are required.' } });
      }
      const result = await fm.rename({
        tenantId: req.user.tenantId,
        targetPath,
        newName: name,
        isFolder: Boolean(isFolder),
      });
      await writeAudit({
        req,
        action: 'file.rename',
        targetType: 'file',
        targetId: null,
        metadata: { from: targetPath, to: result.path },
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async move(req, res, next) {
    try {
      const { items = [], destination = '', mode = 'move' } = req.body;
      if (!Array.isArray(items) || !items.length) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'items is required.' } });
      }
      if (!['move', 'copy'].includes(mode)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'mode must be "move" or "copy".' } });
      }

      const results = [];
      const failed = [];
      for (const item of items) {
        const sourcePath = typeof item === 'string' ? item : item.path;
        const isFolder = typeof item === 'object' && Boolean(item.isFolder);
        const name = String(sourcePath).split('/').filter(Boolean).pop();
        const destinationPath = destination ? `${destination}/${name}` : name;
        try {
          results.push(
            await fm.moveOrCopy({
              tenantId: req.user.tenantId,
              sourcePath,
              destinationPath,
              isFolder,
              mode,
            })
          );
        } catch (err) {
          failed.push({ path: sourcePath, message: err.message });
        }
      }

      await writeAudit({
        req,
        action: mode === 'copy' ? 'file.copy' : 'file.move',
        targetType: 'file',
        targetId: null,
        metadata: { destination, count: results.length, failed: failed.length },
      });

      res.status(results.length || !failed.length ? 200 : 400).json({ results, failed });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const { paths = [], folderPaths = [] } = req.body;
      if (!paths.length && !folderPaths.length) {
        return res
          .status(400)
          .json({ error: { code: 'VALIDATION_ERROR', message: 'paths or folderPaths is required.' } });
      }
      const result = await fm.remove({ tenantId: req.user.tenantId, paths, folderPaths });
      await writeAudit({
        req,
        action: 'file.delete',
        targetType: 'file',
        targetId: null,
        metadata: { files: paths.length, folders: folderPaths.length, objectsDeleted: result.deleted },
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
