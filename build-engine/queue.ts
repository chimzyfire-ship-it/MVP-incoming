import { Queue } from 'bullmq';
import connection from './redis';
export const buildQueue = new Queue('build-queue', { connection });
export async function addBuildJob(githubUrl: string, repoId: string) {
  await buildQueue.add('build', { githubUrl, repoId });
  console.log(`Job added to queue for ${repoId}`);
}
