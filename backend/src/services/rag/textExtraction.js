import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Papa from 'papaparse';
import { ocrPdf } from './ocrService.js';
import { extractPptxText } from './pptxExtraction.js';
import { bufferToTempFile } from '../storage/documentStorage.js';

/**
 * Extracts raw text from a supported file.
 *
 * @param {Buffer} buffer - The file content as a Buffer (downloaded from S3).
 * @param {string} fileType - One of: pdf, docx, txt, csv, pptx.
 * @param {string} [originalName] - Original filename, used to name temp files for
 *   tools that require a real filesystem path (pdf2pic/Tesseract for OCR).
 *
 * Scanned/image-only PDFs are detected (near-zero extracted text per page) and
 * automatically routed through OCR. This function always returns usable text or
 * throws; it never silently returns near-empty content (FR-2.5 in docs/01-brd-srs.md).
 */
export async function extractText(buffer, fileType, originalName = 'document') {
  switch (fileType) {
    case 'pdf': {
      const result = await pdfParse(buffer);
      const looksScanImage = result.text.trim().length < 20 * result.numpages;

      if (looksScanImage) {
        // pdf2pic requires a real file path. Write to a temp file and clean up after.
        const { tmpPath, cleanup } = await bufferToTempFile({ buffer, filename: originalName || 'document.pdf' });
        try {
          const ocrText = await ocrPdf(tmpPath, { pageCount: result.numpages });
          if (ocrText.trim().length === 0) {
            throw new Error('OCR ran but found no readable text in this document.');
          }
          return { text: ocrText, pageCount: result.numpages, wasOcrd: true };
        } finally {
          await cleanup();
        }
      }
      return { text: result.text, pageCount: result.numpages, wasOcrd: false };
    }
    case 'docx': {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value, pageCount: null, wasOcrd: false };
    }
    case 'txt':
    case 'md': {
      return { text: buffer.toString('utf-8'), pageCount: null, wasOcrd: false };
    }
    case 'csv': {
      const parsed = Papa.parse(buffer.toString('utf-8'), { header: true });
      const text = parsed.data.map((row) => Object.values(row).join(' | ')).join('\n');
      return { text, pageCount: null, wasOcrd: false };
    }
    case 'pptx': {
      const { text, pageCount } = await extractPptxText(buffer);
      return { text, pageCount, wasOcrd: false };
    }
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

