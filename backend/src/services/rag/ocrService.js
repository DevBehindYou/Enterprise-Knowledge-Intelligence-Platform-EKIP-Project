import { fromPath } from 'pdf2pic';
import Tesseract from 'tesseract.js';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

/**
 * OCRs a scanned/image-only PDF page-by-page.
 *
 * Pipeline: pdf2pic rasterizes each page to a PNG (via GraphicsMagick + Ghostscript —
 * see backend/Dockerfile for the system packages this needs), then tesseract.js reads
 * text off each page image. Pages are processed sequentially to keep memory bounded;
 * for large documents, consider parallelizing with a worker pool.
 *
 * NOTE: tesseract.js downloads its language traineddata + worker script on first use
 * unless you vendor them locally (see https://github.com/naptha/tesseract.js —
 * "Local installation" section) — required for air-gapped/offline deployments.
 */
export async function ocrPdf(filePath, { pageCount, language = 'eng' } = {}) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ekip-ocr-'));
  const converter = fromPath(filePath, {
    density: 200,
    saveFilename: 'page',
    savePath: tmpDir,
    format: 'png',
    width: 1600,
    height: 2200,
  });

  const worker = await Tesseract.createWorker(language);
  const pageTexts = [];

  try {
    const totalPages = pageCount || (await converter.bulk(-1, { responseType: 'buffer' })).length;

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const page = await converter(pageNumber, { responseType: 'image' });
      const { data } = await worker.recognize(page.path);
      pageTexts.push(data.text);
      await fs.unlink(page.path).catch(() => {});
    }
  } finally {
    await worker.terminate();
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }

  return pageTexts.join('\n\n');
}
