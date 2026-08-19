import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  if (!env.mongodbUri) {
    console.warn('[db] MONGODB_URI not set — skipping connection (routes will error until it is configured).');
    return;
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri, { dbName: env.mongodbDbName });
  console.log(`[db] connected to MongoDB Atlas — db="${env.mongodbDbName}"`);

  mongoose.connection.on('error', (err) => {
    console.error('[db] connection error', err);
  });
}

/**
 * Ensures the Atlas Vector Search index exists on document_chunks.
 * Atlas Vector Search indexes are typically created once via the Atlas UI/CLI/Terraform
 * rather than on every boot, but this helper is provided for scripted environments
 * (see backend/scripts/create-vector-index.js).
 */
export async function ensureVectorIndexDefinition() {
  return {
    name: env.vectorIndexName,
    type: 'vectorSearch',
    definition: {
      fields: [
        { type: 'vector', path: 'embedding', numDimensions: env.vectorDimensions, similarity: 'cosine' },
        { type: 'filter', path: 'tenantId' },
        { type: 'filter', path: 'department' },
        { type: 'filter', path: 'securityLevel' },
      ],
    },
  };
}
