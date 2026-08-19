import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';

// lazyConnect: only opens the TCP connection on the first real command, so
// importing this module (e.g. during tests, or before Redis is up in dev)
// never blocks or throws. An EventEmitter that emits 'error' with zero
// listeners crashes the Node process — the listener below prevents that
// while still surfacing the problem in logs.
export const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});
redisConnection.on('error', (err) => {
  console.error('[redis] connection error — is Redis running? Ingestion will queue but not process until it is.', err.message);
});

export const ingestionQueue = new Queue('ingestion', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 24 * 3600, count: 500 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

/** Enqueues a document for ingestion. Replaces the old fire-and-forget direct call. */
export async function enqueueIngestion(documentId) {
  return ingestionQueue.add('ingest-document', { documentId: String(documentId) }, { jobId: String(documentId) });
}

/** Backs GET /api/ingestion/queue (Admin System Health page). */
export async function getQueueSnapshot() {
  const counts = await ingestionQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
  const activeJobs = await ingestionQueue.getJobs(['active', 'waiting', 'delayed'], 0, 20);
  return {
    counts,
    jobs: activeJobs.map((j) => ({
      id: j.id,
      documentId: j.data.documentId,
      attemptsMade: j.attemptsMade,
      timestamp: j.timestamp,
    })),
  };
}
