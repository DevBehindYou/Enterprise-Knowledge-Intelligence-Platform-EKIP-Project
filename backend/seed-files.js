import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx';
import User from './src/models/User.js';
import { documentService } from './src/services/documentService.js';
import { uploadDocumentToStorage } from './src/services/storage/documentStorage.js';
import { ingestDocument } from './src/services/rag/ingestionService.js';
import { uploadFile } from './src/services/storage/fileManagerService.js';

async function createPDFBuffer(text) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    
    doc.fontSize(20).text('Corporate Strategy Document', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(text);
    doc.end();
  });
}

async function createDOCXBuffer(title, text) {
  const doc = new DocxDocument({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: title, bold: true, size: 40 })],
        }),
        new Paragraph({
          children: [new TextRun({ text, size: 24 })],
        }),
      ],
    }],
  });
  return await Packer.toBuffer(doc);
}

async function runSeeder() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const demoUser = await User.findOne({ email: 'demo@ekip.com' });

  console.log('Generating files...');

  const files = [];

  // 1. Generate PDF
  const pdfBuffer = await createPDFBuffer("Q4 Marketing Strategy 2026\n\nOur focus for Q4 is heavily oriented towards B2B SaaS lead generation. We will double our LinkedIn Ads budget and aggressively target the 'Cloud Migration' search intent. All sales reps must emphasize our 99.99% SLA.");
  files.push({ name: 'Q4_Marketing_Strategy.pdf', type: 'pdf', buffer: pdfBuffer, dept: 'Marketing', level: 'internal' });

  // 2. Generate DOCX
  const docxBuffer = await createDOCXBuffer("Cloud Migration Framework", "The migration to AWS will occur in three phases: 1. Assessment of monolithic apps. 2. Containerization via Docker. 3. Orchestration using Amazon EKS. Downtime is expected during phase 3 and must be communicated 30 days in advance.");
  files.push({ name: 'Cloud_Migration_Framework.docx', type: 'docx', buffer: docxBuffer, dept: 'Engineering', level: 'confidential' });

  // 3. Generate MD
  const mdContent = "# Security Protocols 2026\n\n- All production access requires MFA.\n- Keys must be rotated every 90 days.\n- Employee laptops must have disk encryption (FileVault/BitLocker) enabled.\n- Offboarding must revoke GitHub, AWS, and Slack access within 1 hour.";
  files.push({ name: 'Security_Protocols.md', type: 'md', buffer: Buffer.from(mdContent, 'utf-8'), dept: 'Engineering', level: 'internal' });

  // 4. Generate CSV
  const csvContent = "Region,Revenue,Target,Achieved\nNorth America,$1.2M,$1.0M,Yes\nEMEA,$800K,$900K,No\nAPAC,$450K,$400K,Yes";
  files.push({ name: 'Q3_Regional_Revenue.csv', type: 'csv', buffer: Buffer.from(csvContent, 'utf-8'), dept: 'Sales', level: 'internal' });

  for (const f of files) {
    console.log(`Processing ${f.name}...`);
    const document = await documentService.create({
      tenantId: demoUser.tenantId,
      ownerId: demoUser._id,
      originalName: f.name,
      filename: f.name,
      fileType: f.type,
      department: f.dept,
      securityLevel: f.level,
      allowedRoles: ['admin'],
      tags: ['demo'],
      sizeBytes: f.buffer.length,
      storageUrl: null
    });

    const storageKey = await uploadDocumentToStorage({
      tenantId: String(demoUser.tenantId),
      documentId: String(document._id),
      filename: f.name,
      buffer: f.buffer,
      mimeType: 'application/octet-stream'
    });
    
    document.storageUrl = storageKey;
    await document.save();

    try {
      await ingestDocument(document._id);
      console.log(`Ingested ${f.name}`);
    } catch (err) {
      console.error(`Failed to ingest ${f.name}:`, err.message);
    }
  }

  // Upload Images
  console.log('Uploading images to File Manager...');
  const brainDir = "C:\\Users\\temp\\.gemini\\antigravity-ide\\brain\\10c9428f-2d00-4d88-a831-3a88560df797";
  const brainFiles = await fs.readdir(brainDir);
  const images = brainFiles.filter(f => f.endsWith('.jpg') || f.endsWith('.png'));

  for (const img of images) {
    if (img.includes('architecture_diagram') || img.includes('marketing_banner')) {
      const imgBuffer = await fs.readFile(path.join(brainDir, img));
      const cleanName = img.includes('architecture') ? 'System_Architecture_Diagram.jpg' : 'Q4_Marketing_Banner.jpg';
      await uploadFile({
        tenantId: demoUser.tenantId,
        folderPath: 'Brand Assets',
        filename: cleanName,
        buffer: imgBuffer,
        mimeType: 'image/jpeg'
      });
      console.log(`Uploaded image: ${cleanName}`);
    }
  }

  process.exit(0);
}
runSeeder().catch(console.error);
