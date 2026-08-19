import 'dotenv/config';
import mongoose from 'mongoose';
import Document from './src/models/Document.js';

async function fixDocs() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
  
  // Add 'admin' to allowedRoles for all documents
  const result = await Document.updateMany(
    {},
    { $addToSet: { allowedRoles: 'admin' } }
  );
  
  console.log('Documents updated:', result.modifiedCount);
  process.exit();
}
fixDocs();
