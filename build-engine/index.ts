import 'dotenv/config';
import { addBuildJob } from './queue.js';
import './worker.js'; 
async function run() {
  console.log('Build engine initialized. Waiting for jobs...');
  // await addBuildJob('https://github.com/somachi/gitmurph-test', 'repo-001');
}
run();
