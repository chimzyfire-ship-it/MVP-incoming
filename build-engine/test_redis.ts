import { Redis } from 'ioredis';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const redis = new Redis(process.env.REDIS_URL!);
async function main() {
  const keys = await redis.keys('*');
  console.log("Keys count:", keys.length);
  for (const key of keys) {
    if (key.includes('status') || key.includes('logs')) {
       console.log(key, "=>", await redis.get(key));
    }
  }
  process.exit(0);
}
main().catch(console.error);
