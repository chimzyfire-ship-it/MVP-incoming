import 'dotenv/config';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { exec } from 'child_process';
import { promisify } from 'util';
import { analyzeRepo } from './analyzer.js';
import { generateConfig, writeGeneratedDockerfile } from './configurator.js';

const execAsync = promisify(exec);

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_RETRIES = 5;
const HEALTH_CHECK_TIMEOUT_MS = 60_000; // 60s to wait for URL to respond
const HEALTH_CHECK_POLL_MS = 3_000;     // check every 3s

// ─── Redis ────────────────────────────────────────────────────────────────────

const redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

// ─── Logging helpers ──────────────────────────────────────────────────────────

function log(repoId: string | number, ...args: unknown[]) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${repoId}]`, ...args);
}

async function saveLog(repoId: string | number, message: string) {
  // Append (not overwrite) to the running log in Redis, capped at 4000 chars
  const existing = (await redis.get(`repo:${repoId}:logs`)) || '';
  const updated = `${existing}\n${message}`.slice(-4000);
  await redis.set(`repo:${repoId}:logs`, updated);
}

async function setStatus(repoId: string | number, status: string) {
  await redis.set(`repo:${repoId}:status`, status);
}

// ─── Stage 4: Health Check ────────────────────────────────────────────────────

/**
 * Polls `url` until it responds with a non-5xx status or the timeout is hit.
 * Returns true if healthy, false if the service never came up.
 */
async function healthCheck(url: string, repoId: string | number): Promise<boolean> {
  const deadline = Date.now() + HEALTH_CHECK_TIMEOUT_MS;
  log(repoId, `[Stage 4] Health-checking ${url} …`);

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.status < 500) {
        log(repoId, `[Stage 4] ✓ Service healthy (HTTP ${res.status})`);
        return true;
      }
      log(repoId, `[Stage 4] Server returned ${res.status} — retrying …`);
    } catch {
      // Connection refused or timeout — still booting
    }
    await new Promise(r => setTimeout(r, HEALTH_CHECK_POLL_MS));
  }

  log(repoId, `[Stage 4] ✗ Service did not become healthy within ${HEALTH_CHECK_TIMEOUT_MS / 1000}s`);
  return false;
}

// ─── Stage 3: AI Recovery (LLM Placeholder) ──────────────────────────────────

/**
 * Given the error output from a failed deploy attempt, return an english-language
 * recovery hint that we log for now.
 *
 * UPGRADE PATH: When GROQ_API_KEY is set in .env, this function will call the
 * Groq LLM API to get a structured patch action (e.g. "write a Dockerfile",
 * "add a missing --port flag to the start command"). For Phase 1 it logs the
 * raw error and returns a plain-english message.
 */
async function diagnoseError(
  errorOutput: string,
  attempt: number,
  repoId: string | number,
): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    // Phase 1: no LLM key — log the raw error, return a human hint
    log(repoId, `[Stage 3] Attempt ${attempt} failed. No GROQ_API_KEY set — skipping AI diagnosis.`);
    log(repoId, `[Stage 3] Raw error: ${errorOutput.slice(0, 600)}`);
    await saveLog(repoId, `[Attempt ${attempt}] ✗ ${errorOutput.slice(0, 600)}`);
    return 'No AI recovery available — retrying with next build strategy.';
  }

  // ── Phase 2 upgrade: call Groq LLM ────────────────────────────────────────
  // (This block activates the moment GROQ_API_KEY is added to .env)
  try {
    log(repoId, `[Stage 3] Calling Groq LLM to diagnose attempt ${attempt} failure …`);
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        max_tokens: 512,
        messages: [
          {
            role: 'system',
            content: `You are a deployment engineer. A GitHub repo failed to deploy. 
Diagnose the error in one sentence and suggest ONE specific shell command or file change that would fix it.
Reply in JSON: { "diagnosis": "...", "fix": "shell command or file write instruction" }`,
          },
          {
            role: 'user',
            content: `Deploy error (attempt ${attempt}):\n${errorOutput.slice(0, 2000)}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      log(repoId, `[Stage 3] Groq returned ${res.status} — continuing without AI fix.`);
      return 'Groq API error — continuing without AI fix.';
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(content) as { diagnosis: string; fix: string };
      log(repoId, `[Stage 3] AI Diagnosis: ${parsed.diagnosis}`);
      log(repoId, `[Stage 3] AI Suggested Fix: ${parsed.fix}`);
      await saveLog(repoId, `[AI] ${parsed.diagnosis} | Fix: ${parsed.fix}`);
      return parsed.fix;
    } catch {
      log(repoId, `[Stage 3] Could not parse Groq response — raw: ${content.slice(0, 200)}`);
      return content.slice(0, 200);
    }
  } catch (err) {
    log(repoId, `[Stage 3] Groq call threw: ${err}`);
    return 'Groq call failed — continuing without AI fix.';
  }
}

// ─── Build attempt ────────────────────────────────────────────────────────────

async function attemptDeploy(
  appName: string,
  tmpDir: string,
  env: Record<string, string>,
  repoId: string | number,
  strategy: string,
): Promise<{ ok: boolean; output: string }> {
  // Build the env flags for flyctl deploy
  const envFlags = Object.entries(env)
    .filter(([, v]) => v && !v.includes(' ')) // skip values with spaces for safety
    .map(([k, v]) => `--env ${k}=${v}`)
    .join(' ');

  let deployCmd: string;

  switch (strategy) {
    case 'existing-dockerfile':
    case 'generated-dockerfile':
      deployCmd = `flyctl deploy . --app ${appName} --ha=false ${envFlags} --dockerfile Dockerfile`;
      break;
    case 'nixpacks':
    default:
      deployCmd = `flyctl deploy . --app ${appName} --nixpacks --ha=false ${envFlags}`;
      break;
  }

  try {
    const { stdout, stderr } = await execAsync(deployCmd, {
      cwd: tmpDir,
      env: { ...process.env, FLY_API_TOKEN: process.env.FLY_API_TOKEN },
      timeout: 10 * 60 * 1000, // 10-minute timeout per attempt
    });
    return { ok: true, output: `${stdout}\n${stderr}` };
  } catch (err: unknown) {
    const e = err as { stderr?: string; stdout?: string; message?: string };
    const output = [e.stderr, e.stdout, e.message].filter(Boolean).join('\n');
    return { ok: false, output };
  }
}

// ─── Worker ───────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════╗');
console.log('║  GITMORPH BUILD ENGINE — MASTER PIPELINE ║');
console.log('║  Four-Stage Deployment Pipeline online.  ║');
console.log('╚══════════════════════════════════════════╝');

export const worker = new Worker('Run Cloud', async job => {
  const githubUrl: string = job.data.url || job.data.githubUrl;
  const repoId: string | number = job.data.repoId || job.data.id || 'unknown';
  const repoTitle: string = job.data.title || (githubUrl.split('/').slice(-2).join('-'));

  log(repoId, `▶ Job received. URL: ${githubUrl}`);
  await setStatus(repoId, 'analyzing');
  await saveLog(repoId, `Job started. URL: ${githubUrl}`);

  const tmpDir = `./tmp-${repoId}-${Date.now()}`;

  try {
    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 1 — Static Analysis
    // ──────────────────────────────────────────────────────────────────────────
    log(repoId, '[Stage 1] Cloning repository …');
    await setStatus(repoId, 'cloning');
    await execAsync(`git clone --depth 1 ${githubUrl} ${tmpDir}`);
    log(repoId, '[Stage 1] Clone complete. Running static analysis …');

    const analysis = await analyzeRepo(tmpDir);
    log(repoId, `[Stage 1] Language: ${analysis.primaryLanguage} | Framework: ${analysis.framework}`);
    log(repoId, `[Stage 1] GPU: ${analysis.needsGpu} | Postgres: ${analysis.needsPostgres} | Redis: ${analysis.needsRedis}`);
    log(repoId, `[Stage 1] Recommended infra: ${analysis.recommendedInfra}`);
    if (analysis.warnings.length) log(repoId, `[Stage 1] Warnings: ${analysis.warnings.join(', ')}`);
    await saveLog(repoId, `[Stage 1] ✓ ${analysis.framework} on ${analysis.primaryLanguage} — infra: ${analysis.recommendedInfra}`);

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 2 — Configuration Generation
    // ──────────────────────────────────────────────────────────────────────────
    log(repoId, '[Stage 2] Generating deploy configuration …');
    await setStatus(repoId, 'configuring');

    const config = await generateConfig(analysis, repoTitle, String(repoId));
    for (const line of config.summary) log(repoId, `[Stage 2] ${line}`);
    await saveLog(repoId, `[Stage 2] ✓ App: ${config.appName} | Port: ${config.port} | Strategies: ${config.buildStrategy.join(' → ')}`);

    // Create Fly app (ignore if already exists)
    try {
      log(repoId, `[Stage 2] Creating Fly app: ${config.appName} …`);
      await execAsync(
        `flyctl apps create ${config.appName} --machines --org personal`,
        { env: { ...process.env, FLY_API_TOKEN: process.env.FLY_API_TOKEN } }
      );
    } catch {
      log(repoId, `[Stage 2] App ${config.appName} already exists — continuing.`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 3 — Build with Iterative Error Recovery
    // Up to MAX_RETRIES attempts, cycling through build strategies.
    // If GROQ_API_KEY is set, the LLM diagnoses each failure.
    // ──────────────────────────────────────────────────────────────────────────
    await setStatus(repoId, 'building');
    log(repoId, `[Stage 3] Beginning build loop. Max attempts: ${MAX_RETRIES}.`);

    let deployedUrl: string | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // Pick the strategy for this attempt:
      // attempt 1 → strategy[0], attempt 2 → strategy[1], etc.
      // Once we've exhausted the strategy list, keep trying the last one.
      const strategyIndex = Math.min(attempt - 1, config.buildStrategy.length - 1);
      const strategy = config.buildStrategy[strategyIndex] ?? 'nixpacks';

      log(repoId, `[Stage 3] Attempt ${attempt}/${MAX_RETRIES} — strategy: ${strategy}`);
      await saveLog(repoId, `[Attempt ${attempt}] Strategy: ${strategy}`);

      // If this attempt uses the generated Dockerfile, write it to disk first
      if (strategy === 'generated-dockerfile' && config.generatedDockerfile) {
        log(repoId, '[Stage 3] Writing AI-generated Dockerfile to disk …');
        await writeGeneratedDockerfile(tmpDir, config.generatedDockerfile);
        await saveLog(repoId, '[Attempt] Wrote generated Dockerfile.');
      }

      const result = await attemptDeploy(
        config.appName,
        tmpDir,
        config.env,
        repoId,
        strategy,
      );

      if (result.ok) {
        log(repoId, `[Stage 3] ✓ Build succeeded on attempt ${attempt}.`);
        await saveLog(repoId, `[Attempt ${attempt}] ✓ Build succeeded.`);
        deployedUrl = `https://${config.appName}.fly.dev`;
        break;
      }

      // Build failed — diagnose and prepare next attempt
      log(repoId, `[Stage 3] ✗ Attempt ${attempt} failed.`);
      await diagnoseError(result.output, attempt, repoId);

      if (attempt === MAX_RETRIES) {
        // All retries exhausted — surface a plain-English failure
        const friendlyMessage =
          `We could not get this tool running after ${MAX_RETRIES} attempts. ` +
          `This usually means it needs a paid API key, GPU hardware, or a database ` +
          `we could not provision automatically. We are working on better support for this type of tool.`;
        log(repoId, `[Stage 3] All ${MAX_RETRIES} attempts exhausted.`);
        await saveLog(repoId, `[Stage 3] ✗ ${friendlyMessage}`);
        throw new Error(friendlyMessage);
      }

      // Brief cool-down before next attempt
      await new Promise(r => setTimeout(r, 2000));
    }

    if (!deployedUrl) throw new Error('No URL after successful build (this should not happen).');

    // ──────────────────────────────────────────────────────────────────────────
    // STAGE 4 — Health Check and Result Delivery
    // ──────────────────────────────────────────────────────────────────────────
    await setStatus(repoId, 'health-checking');
    log(repoId, `[Stage 4] Running health check on ${deployedUrl} …`);

    const healthy = await healthCheck(deployedUrl, repoId);

    if (!healthy) {
      const message =
        'The tool deployed but did not respond in time. It may still be starting up. ' +
        'Try opening it manually — it should be available shortly.';
      await saveLog(repoId, `[Stage 4] ⚠ ${message}`);
      log(repoId, `[Stage 4] ⚠ Health check timed out — marking as running anyway.`);
      // We still mark it as running — Fly.io may just be slow on first boot
    } else {
      log(repoId, `[Stage 4] ✓ Health check passed.`);
      await saveLog(repoId, `[Stage 4] ✓ Service is live and responding.`);
    }

    // ── Deliver result ────────────────────────────────────────────────────────
    await redis.set(`repo:${repoId}:url`, deployedUrl);
    await setStatus(repoId, 'running');
    log(repoId, `✅ Pipeline complete. Live at: ${deployedUrl}`);
    await saveLog(repoId, `✅ Live at ${deployedUrl}`);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log(repoId, `❌ Pipeline failed: ${msg}`);
    await setStatus(repoId, 'failed');
    // Do NOT show stack traces to the user — the friendly message is already in logs
    // from the retry loop.
    throw error;
  } finally {
    // Always clean up the temp directory
    try {
      await execAsync(`rm -rf ${tmpDir}`);
      log(repoId, `[Cleanup] Removed ${tmpDir}`);
    } catch {
      log(repoId, `[Cleanup] Could not remove ${tmpDir} — ignoring.`);
    }
  }

}, { connection: redis });

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed permanently:`, err.message);
});

worker.on('completed', job => {
  console.log(`[Worker] Job ${job.id} completed.`);
});
