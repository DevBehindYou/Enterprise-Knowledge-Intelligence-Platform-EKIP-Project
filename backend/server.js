import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Bypass local proxy/antivirus SSL issues
import app from './src/app.js';
import { connectDB } from './src/config/db.js';

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();

  // Free-tier deploys (e.g. Render's single free web service) can't afford a
  // separate worker process. Setting RUN_INLINE_WORKER=true runs the BullMQ
  // ingestion worker inside the API process instead. Dedicated deployments
  // leave this unset and run `npm run worker` as its own service â€” see
  // DEPLOYMENT.md. Imported dynamically so a deploy that doesn't use the queue
  // (and hasn't provisioned Redis) never pays the connection cost.
  if (process.env.RUN_INLINE_WORKER === 'true') {
    const { startIngestionWorker } = await import('./src/queues/ingestionWorker.js');
    startIngestionWorker();
    console.log('[ekip-backend] inline ingestion worker started (RUN_INLINE_WORKER=true)');
  }

  app.listen(PORT, () => {
    console.log(`[ekip-backend] listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

start().catch((err) => {
  console.error('[ekip-backend] failed to start', err);
  process.exit(1);
});

