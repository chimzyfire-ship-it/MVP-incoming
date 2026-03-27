import { addBuildJob } from './queue';
import './worker'; 
async function run() {
  console.log('Build engine initialized. Waiting for jobs...');
  await addBuildJob('https://github.com/somachi/gitmurph-test', 'repo-001');
}
run();
