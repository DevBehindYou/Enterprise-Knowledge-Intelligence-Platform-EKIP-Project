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

async function createPDFBuffer(title, text) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    
    doc.fontSize(20).text(title, { align: 'center' });
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
        new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 32 })] }),
        new Paragraph({ children: [new TextRun({ text, size: 24 })] }),
      ],
    }],
  });
  return await Packer.toBuffer(doc);
}

const TOPICS = [
  // PDFs (8 files)
  { type: 'pdf', dept: 'HR', title: 'Code of Conduct 2027', content: 'All employees are expected to maintain the highest standards of integrity. Harassment of any kind will not be tolerated. See appendix for reporting structures.' },
  { type: 'pdf', dept: 'Sales', title: 'Pricing Adjustments Q1', content: 'Due to increased server costs, our Enterprise tier is increasing by 12%. Legacy customers are grandfathered in for 24 months.' },
  { type: 'pdf', dept: 'Engineering', title: 'SOC2 Compliance Audit', content: 'The external SOC2 Type II audit concluded with zero exceptions. Key areas reviewed: Access controls, disaster recovery, and incident response.' },
  { type: 'pdf', dept: 'Marketing', title: 'Brand Identity Guidelines', content: 'Primary color: #1E3A8A (Blue). Font: Inter. Do not alter the logo aspect ratio. Use the dark variant on light backgrounds.' },
  { type: 'pdf', dept: 'Engineering', title: 'Zero Trust Network Architecture', content: 'EKIP has transitioned to a BeyondCorp-style zero trust architecture. VPN is no longer required for internal apps; rely on identity-aware proxies.' },
  { type: 'pdf', dept: 'HR', title: 'Employee Stock Options Plan', content: 'Vesting occurs over 4 years with a 1-year cliff. Options expire 90 days after termination of employment.' },
  { type: 'pdf', dept: 'Sales', title: 'Objection Handling Playbook', content: 'If the prospect says "It\'s too expensive", pivot to the ROI calculator showing the average 30% reduction in support ticket resolution time.' },
  { type: 'pdf', dept: 'Marketing', title: 'SEO Strategy 2027', content: 'Focus on long-tail keywords surrounding "AI knowledge management". Publish 4 high-quality technical blogs per month.' },

  // DOCX (7 files)
  { type: 'docx', dept: 'Engineering', title: 'Disaster Recovery Plan', content: 'RPO: 1 hour. RTO: 4 hours. In the event of a total region failure, failover to eu-central-1 via Route 53.' },
  { type: 'docx', dept: 'HR', title: 'Onboarding Checklist', content: 'Day 1: IT Setup. Day 2: Meet the team. Day 3: Compliance training. Week 1: First pull request or shadow call.' },
  { type: 'docx', dept: 'Sales', title: 'Partner Agreement Template', content: 'This template outlines the standard 20% revenue share agreement for implementation partners and resellers.' },
  { type: 'docx', dept: 'Marketing', title: 'Press Release Template', content: 'FOR IMMEDIATE RELEASE. City, State – Date – EKIP announces [Feature Name], revolutionizing how enterprises access knowledge.' },
  { type: 'docx', dept: 'Engineering', title: 'GraphQL API Best Practices', content: 'Always use DataLoader to prevent N+1 queries. Paginate using cursor-based connections, not offset/limit.' },
  { type: 'docx', dept: 'HR', title: 'Remote Work Ergonomics', content: 'Employees are eligible for a $500 stipend to purchase ergonomic chairs, standing desks, and external monitors.' },
  { type: 'docx', dept: 'Sales', title: 'Q2 Target Accounts', content: 'Top 5 targets: Acme Corp, Globex, Initech, Umbrella Corp, Stark Industries. Account Execs to begin outbound sequences on Monday.' },

  // MD (5 files)
  { type: 'md', dept: 'Engineering', title: 'Git Workflow.md', content: '# Git Workflow\n- Branch naming: `feat/ticket-id`, `fix/ticket-id`.\n- Rebase main before opening a PR.\n- Squash commits on merge.' },
  { type: 'md', dept: 'Engineering', title: 'Database Schema Changes.md', content: '# DB Changes\nAll MongoDB schema migrations must be written using the umzug framework and tested against staging.' },
  { type: 'md', dept: 'Engineering', title: 'Incident 4043 Postmortem.md', content: '# Postmortem: Outage on Aug 12\n**Root Cause:** Redis OOM killed the cache tier.\n**Action Item:** Increase maxmemory-policy to allkeys-lru and provision larger nodes.' },
  { type: 'md', dept: 'HR', title: 'Interview Rubric.md', content: '# Engineering Rubric\n1. Technical capability (1-5)\n2. Communication (1-5)\n3. Values alignment (1-5)' },
  { type: 'md', dept: 'Marketing', title: 'Tone of Voice.md', content: '# Brand Tone\n- Confident but not arrogant.\n- Helpful and clear.\n- Technical but accessible.' },

  // CSV (5 files)
  { type: 'csv', dept: 'Sales', title: 'Q1_Pipeline.csv', content: 'Company,Stage,Probability,Value\nAcme,Discovery,20%,$50000\nGlobex,Negotiation,80%,$120000\nInitech,Closed Won,100%,$45000' },
  { type: 'csv', dept: 'HR', title: 'Employee_Count_2026.csv', content: 'Month,Engineering,Sales,Marketing,HR\nJan,40,15,5,2\nFeb,42,16,6,2\nMar,45,18,6,3' },
  { type: 'csv', dept: 'Marketing', title: 'Ad_Spend_Report.csv', content: 'Platform,Spend,Clicks,Conversions,CPA\nLinkedIn,$5000,1200,45,$111\nGoogle Ads,$8000,3400,120,$66' },
  { type: 'csv', dept: 'Sales', title: 'Churn_Report.csv', content: 'Customer,MRR_Lost,Reason,Date\nWidgets Inc,$1000,Missing feature,2026-03-01\nTechCorp,$2500,Budget cuts,2026-05-15' },
  { type: 'csv', dept: 'Engineering', title: 'API_Latency.csv', content: 'Endpoint,Avg_ms,P95_ms,P99_ms\n/api/search,120,250,450\n/api/documents,45,80,120' }
];

async function seedMassiveMixed() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  const demoUser = await User.findOne({ email: 'demo@ekip.com' });

  console.log(`Starting generation of ${TOPICS.length} complex files...`);
  let successCount = 0;

  for (const t of TOPICS) {
    let buffer;
    let fileName = t.title;
    
    if (t.type === 'pdf') {
      fileName = `${t.title.replace(/ /g, '_')}.pdf`;
      buffer = await createPDFBuffer(t.title, t.content);
    } else if (t.type === 'docx') {
      fileName = `${t.title.replace(/ /g, '_')}.docx`;
      buffer = await createDOCXBuffer(t.title, t.content);
    } else if (t.type === 'md') {
      fileName = t.title.replace(/ /g, '_');
      if (!fileName.endsWith('.md')) fileName += '.md';
      buffer = Buffer.from(t.content, 'utf-8');
    } else if (t.type === 'csv') {
      fileName = t.title.replace(/ /g, '_');
      if (!fileName.endsWith('.csv')) fileName += '.csv';
      buffer = Buffer.from(t.content, 'utf-8');
    }

    const document = await documentService.create({
      tenantId: demoUser.tenantId,
      ownerId: demoUser._id,
      originalName: fileName,
      filename: fileName,
      fileType: t.type,
      department: t.dept,
      securityLevel: 'internal',
      allowedRoles: ['admin'],
      tags: ['demo-5x'],
      sizeBytes: buffer.length,
      storageUrl: null
    });

    const storageKey = await uploadDocumentToStorage({
      tenantId: String(demoUser.tenantId),
      documentId: String(document._id),
      filename: fileName,
      buffer: buffer,
      mimeType: 'application/octet-stream'
    });
    
    document.storageUrl = storageKey;
    await document.save();

    try {
      await ingestDocument(document._id);
      successCount++;
      process.stdout.write('.');
    } catch (err) {
      console.error(`\nFailed on ${fileName}: ${err.message}`);
    }
  }

  console.log(`\nMixed bulk seed complete! Successfully ingested ${successCount} documents.`);
  process.exit(0);
}

seedMassiveMixed().catch(console.error);
