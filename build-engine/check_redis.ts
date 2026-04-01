import Redis from 'ioredis';
import { Queue } from 'bullmq';
const redis = new Redis(process.env.REDIS_URL);
const queue = new Queue('Run Cloud', { connection: redis });
async function check() {
  const count = await queue.getJobCounts();
  console.log("Job counts:", count);
  const jobs = await queue.getJobs(['wait', 'active', 'delayed', 'failed', 'completed']);
  console.log("Jobs:", jobs.map(j => ({ id: j.id, name: j.name, data: j.data })));
  process.exit(0);
}
check();
