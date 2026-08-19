import 'dotenv/config';
import { connectDB } from './src/config/db.js';
import { startIngestionWorker } from './src/queues/ingestionWorker.js';

async function start() {
  await connectDB();
  startIngestionWorker();
  console.log('[ekip-worker] ingestion worker started, waiting for jobs…');
}

start().catch((err) => {
  console.error('[ekip-worker] failed to start', err);
  process.exit(1);
});
