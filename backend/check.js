import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import Document from './src/models/Document.js';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  
  const user = await User.findOne({ email: 'demo@ekip.com' });
  console.log('Demo User:', user.name, '| Role:', user.role, '| Department:', user.department, '| Tenant:', user.tenantId);
  
  const docs = await Document.find({ tenantId: user.tenantId }).select('originalName department securityLevel status ownerId');
  console.log('Documents in DB for this tenant:');
  console.log(docs);
  
  process.exit();
}
check();
