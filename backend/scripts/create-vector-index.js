// One-off script: `node scripts/create-vector-index.js`
// Creates the Atlas Vector Search index on document_chunks if it doesn't already exist.
// Requires the MongoDB Node driver's search index helpers (Atlas-hosted clusters only).
import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { ensureVectorIndexDefinition } from '../src/config/db.js';

async function main() {
  await mongoose.connect(env.mongodbUri, { dbName: env.mongodbDbName });
  const collection = mongoose.connection.collection('document_chunks');
  const def = await ensureVectorIndexDefinition();

  const existing = await collection.listSearchIndexes(def.name).toArray().catch(() => []);
  if (existing.length > 0) {
    console.log(`[vector-index] "${def.name}" already exists — skipping.`);
    return process.exit(0);
  }

  await collection.createSearchIndex(def);
  console.log(`[vector-index] created "${def.name}" on document_chunks.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[vector-index] failed', err);
  process.exit(1);
});
