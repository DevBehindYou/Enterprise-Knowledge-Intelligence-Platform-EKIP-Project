import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import StorageConfig from './src/models/StorageConfig.js';
import { documentService } from './src/services/documentService.js';
import { uploadDocumentToStorage } from './src/services/storage/documentStorage.js';
import { ingestDocument } from './src/services/rag/ingestionService.js';

const TOPICS = [
  { dept: 'HR', level: 'internal', subjects: ['Remote Work Policy', 'Performance Review Guidelines', 'Diversity & Inclusion', 'Holiday Schedule 2027', 'Expense Reimbursement', 'Mental Health Benefits', 'Referral Bonus Program', 'Offboarding Process', 'Code of Conduct'] },
  { dept: 'Sales', level: 'confidential', subjects: ['Q1 2027 Projections', 'Enterprise Pitch Deck Notes', 'Competitor Battlecard: Guru', 'Competitor Battlecard: Glean', 'Discount Approval Matrix', 'Sales Commission Structure', 'Lead Qualification Framework', 'Objection Handling Guide', 'Outbound Sequence Templates'] },
  { dept: 'Engineering', level: 'internal', subjects: ['Microservices Architecture v2', 'Database Migration Plan', 'Incident Response Playbook', 'Frontend Coding Standards', 'API Rate Limiting Spec', 'Kubernetes Deployment Guide', 'AWS Cost Optimization', 'QA Testing Strategy', 'GraphQL Federation Setup'] },
  { dept: 'Marketing', level: 'public', subjects: ['Brand Guidelines', 'Social Media Strategy Q4', 'Customer Case Study: Acme Corp', 'Webinar Playbook', 'SEO Keyword Strategy', 'Content Calendar', 'PR Crisis Management', 'Event Sponsorship Tiers'] }
];

async function seedMassive() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  
  const demoUser = await User.findOne({ email: 'demo@ekip.com' });
  const docsToCreate = [];

  for (const topic of TOPICS) {
    for (let i = 0; i < topic.subjects.length; i++) {
      const subject = topic.subjects[i];
      docsToCreate.push({
        name: `${subject.replace(/[^a-zA-Z0-9]/g, '_')}.txt`,
        content: `Document: ${subject}\nDepartment: ${topic.dept}\n\nThis is the official document covering ${subject}. It contains critical guidelines, best practices, and standard operating procedures for the ${topic.dept} team. Please ensure all team members read and acknowledge this material. In case of any questions regarding ${subject}, reach out to the ${topic.dept} department head.`,
        department: topic.dept,
        securityLevel: topic.level
      });
    }
  }

  console.log(`Starting bulk seed of ${docsToCreate.length} documents...`);
  
  let successCount = 0;
  for (const doc of docsToCreate) {
    const buffer = Buffer.from(doc.content, 'utf-8');
    
    const document = await documentService.create({
      tenantId: demoUser.tenantId,
      ownerId: demoUser._id,
      originalName: doc.name,
      filename: doc.name,
      fileType: 'txt',
      department: doc.department,
      securityLevel: doc.securityLevel,
      allowedRoles: ['admin'], // Ensure admin can see them all
      tags: ['demo-bulk'],
      sizeBytes: buffer.length,
      storageUrl: null
    });

    const storageKey = await uploadDocumentToStorage({
      tenantId: String(demoUser.tenantId),
      documentId: String(document._id),
      filename: doc.name,
      buffer: buffer,
      mimeType: 'text/plain'
    });
    
    document.storageUrl = storageKey;
    await document.save();

    try {
      await ingestDocument(document._id);
      successCount++;
      process.stdout.write('.');
    } catch (err) {
      console.error(`\nFailed on ${doc.name}: ${err.message}`);
    }
  }

  console.log(`\nBulk seed complete! Successfully ingested ${successCount} documents.`);
  process.exit(0);
}

seedMassive().catch(console.error);
