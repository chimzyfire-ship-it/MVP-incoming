import { Worker } from 'bullmq';
import connection from './redis';
export const worker = new Worker('build-queue', async job => {
  console.log(`Starting build for [${job.data.githubUrl}]...`);
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log(`Successfully built container image for [${job.data.repoId}]`);
}, { connection });
