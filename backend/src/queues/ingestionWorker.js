import { Worker } from 'bullmq';
import { redisConnection } from './ingestionQueue.js';
import { ingestDocument } from '../services/rag/ingestionService.js';

/**
 * Run as a separate process: `npm run worker` (see backend/worker.js).
 * Keeping this out of the API process means a slow/failing ingestion job
 * never ties up request-handling capacity.
 */
export function startIngestionWorker() {
  const worker = new Worker(
    'ingestion',
    async (job) => {
      const { documentId } = job.data;
      await ingestDocument(documentId);
    },
    { connection: redisConnection, concurrency: 3 }
  );

  worker.on('completed', (job) => console.log(`[ingestion-worker] completed job ${job.id} (document ${job.data.documentId})`));
  worker.on('failed', (job, err) => console.error(`[ingestion-worker] job ${job?.id} failed`, err.message));

  return worker;
}
