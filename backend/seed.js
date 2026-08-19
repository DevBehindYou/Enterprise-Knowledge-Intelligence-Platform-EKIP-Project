import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import StorageConfig from './src/models/StorageConfig.js';
import { documentService } from './src/services/documentService.js';
import { uploadDocumentToStorage } from './src/services/storage/documentStorage.js';
import { ingestDocument } from './src/services/rag/ingestionService.js';
import { uploadFile } from './src/services/storage/fileManagerService.js';

const DEMO_DOCUMENTS = [
  {
    name: 'Employee_Handbook_2026.txt',
    content: `EKIP Employee Handbook 2026
Welcome to EKIP! Our core values are transparency, ownership, and velocity.
Standard work hours are 9 AM to 5 PM in your local timezone, but we operate asynchronously.
PTO policy: Unlimited PTO. Please coordinate with your manager at least 2 weeks in advance for vacations longer than 3 days.
Benefits: 100% health coverage, 401k match up to 5%, and a $1,000 annual learning stipend.
Security: Never share your passwords. Always lock your screen. Use the VPN when on public Wi-Fi.`,
    department: 'HR',
    securityLevel: 'internal'
  },
  {
    name: 'Q3_Sales_Strategy.txt',
    content: `Q3 2026 Sales Strategy
Goal: Increase enterprise ARR by 25%.
Target Verticals: Healthcare and Financial Services.
Value Prop: EKIP reduces time spent searching for internal information by 40%, directly impacting bottom-line productivity.
Pricing: Enterprise tier starts at $50/user/month with a minimum of 100 seats.
Key competitors: Glean, Guru, Notion AI.
Strategy: Focus on SOC2 compliance and our zero-retention data privacy guarantees as key differentiators.`,
    department: 'Sales',
    securityLevel: 'confidential'
  },
  {
    name: 'Engineering_Onboarding.txt',
    content: `Engineering Onboarding Guide
1. Request access to GitHub and AWS from the IT portal.
2. Clone the main EKIP repository.
3. Run 'npm install' in both frontend and backend directories.
4. We use React, Vite, TailwindCSS for the frontend, and Node.js, Express, MongoDB for the backend.
5. All code must pass 'npm run lint' and require at least one approving review before merging to the main branch.
6. Deployments to staging happen automatically on merge. Production deployments happen every Tuesday and Thursday at 10 AM PST.`,
    department: 'Engineering',
    securityLevel: 'internal'
  }
];

async function seed() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  console.log('Connected to DB');

  const demoUser = await User.findOne({ email: 'demo@ekip.com' });
  if (!demoUser) {
    console.error('Demo user not found!');
    process.exit(1);
  }

  const activeConfig = await StorageConfig.findOne({ isActive: true });
  if (!activeConfig) {
    console.error('No active storage configuration found! Please connect S3 first.');
    process.exit(1);
  }

  console.log('Seeding Document Library and Vector DB...');
  for (const doc of DEMO_DOCUMENTS) {
    console.log(`Processing ${doc.name}...`);
    const buffer = Buffer.from(doc.content, 'utf-8');
    
    // 1. Create DB record
    const document = await documentService.create({
      tenantId: demoUser.tenantId,
      ownerId: demoUser._id,
      originalName: doc.name,
      filename: doc.name,
      fileType: 'txt',
      department: doc.department,
      securityLevel: doc.securityLevel,
      allowedRoles: [],
      tags: ['demo', '2026'],
      sizeBytes: buffer.length,
      storageUrl: null
    });

    // 2. Upload to S3
    const storageKey = await uploadDocumentToStorage({
      tenantId: String(demoUser.tenantId),
      documentId: String(document._id),
      filename: doc.name,
      buffer: buffer,
      mimeType: 'text/plain'
    });
    
    document.storageUrl = storageKey;
    await document.save();

    // 3. Ingest
    try {
      await ingestDocument(document._id);
      console.log(`Successfully ingested ${doc.name}`);
    } catch (err) {
      console.error(`Failed to ingest ${doc.name}:`, err.message);
    }
  }

  console.log('Seeding File Manager (Raw Files)...');
  try {
    await uploadFile({
      tenantId: demoUser.tenantId,
      folderPath: '/',
      filename: 'ekip-architecture.txt',
      buffer: Buffer.from('EKIP Architecture:\nFrontend: React, Vite, Tailwind\nBackend: Node, Express, MongoDB\nStorage: S3 API'),
      mimeType: 'text/plain'
    });
    console.log('Successfully added file to File Manager');
  } catch (err) {
    console.error('Failed to add file to File Manager:', err.message);
  }

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch(console.error);
