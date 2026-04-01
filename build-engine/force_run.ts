import Redis from 'ioredis';
import { Queue } from 'bullmq';
import 'dotenv/config';

const redis = new Redis(process.env.REDIS_URL);
const queue = new Queue('Run Cloud', { connection: redis });

async function forceRun() {
  await queue.add('build', { githubUrl: 'https://github.com/EbookFoundation/free-programming-books', repoId: '37123456' }); // Guessing ID
  await queue.add('build', { githubUrl: 'https://github.com/chimzyfire-ship-it/MVP-incoming', repoId: 'MVP-incoming' });
  console.log("Forced jobs into queue");
  process.exit(0);
}
forceRun();
