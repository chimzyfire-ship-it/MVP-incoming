import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

// ── Queue name must match the Worker in worker.ts ─────────────────────────────
const QUEUE_NAME = 'Run Cloud';

const redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

export const buildQueue = new Queue(QUEUE_NAME, { connection: redis });

export async function addBuildJob(
  githubUrl: string,
  repoId: string,
  title?: string,
) {
  const job = await buildQueue.add('build', { githubUrl, repoId, title });
  console.log(`[queue] Job ${job.id} added to "${QUEUE_NAME}" for ${repoId}`);
  return job;
}
