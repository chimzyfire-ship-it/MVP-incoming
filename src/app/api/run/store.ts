import { randomUUID } from "crypto";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { promises as fs } from "fs";

interface RepoPayload {
  id: number;
  title: string;
  plainEnglishDescription: string;
  stars: number;
  forks?: number;
  collaborators?: number;
  fullName?: string;
  url: string;
  language?: string;
  owner?: string;
  avatar?: string;
  coverImage?: string;
  topics?: string[];
}

export type RunStage = "queued" | "detecting" | "installing" | "building" | "running" | "failed";

interface RuntimeProfile {
  runtime: string;
  framework: string;
  packageManager: string;
  installCommand: string;
  buildCommand: string;
  startCommand: string;
}

interface SecurityPolicy {
  network: string;
  filesystem: string;
}

interface SandboxProfile {
  engine: string;
  cpu: string;
  memoryMb: number;
}

interface HealthStatus {
  status: "starting" | "healthy" | "degraded";
  restartCount: number;
  lastCheckAt: number;
}

interface InfraServiceFlags {
  postgres: boolean;
  redis: boolean;
}

interface InfraProfile {
  template: string;
  services: InfraServiceFlags;
  envKeys: string[];
  secretRefs: string[];
}

interface ServiceBindings {
  postgresUrl?: string;
  redisUrl?: string;
}

export interface RunJob {
  id: string;
  repo: RepoPayload;
  stage: RunStage;
  createdAt: number;
  updatedAt: number;
  runtime: RuntimeProfile;
  sandbox: SandboxProfile;
  security: SecurityPolicy;
  cacheKey: string;
  appUrl: string | null;
  health: HealthStatus;
  infra: InfraProfile;
  serviceBindings: ServiceBindings;
  logs: string[];
}

interface StoredRunJob extends RunJob {
  workspacePath: string;
  port: number | null;
  executor: "local" | "docker";
  targetOrigin: string | null;
  containerId: string | null;
  injectedEnv: Record<string, string>;
  serviceContainers: string[];
  infraNetwork: string | null;
}

interface ExecutionPlan {
  profile: RuntimeProfile;
  installCommands: string[];
  buildCommands: string[];
  startCommands: string[];
}

interface RunJobOptions {
  runtime?: string;
  env?: Record<string, string>;
  secretRefs?: string[];
  services?: Partial<InfraServiceFlags>;
}

interface RunState {
  jobs: Map<string, StoredRunJob>;
  processes: Map<string, ChildProcess>;
  startCommands: Map<string, string>;
  queue: string[];
  processing: boolean;
  loaded: boolean;
}

const DATA_ROOT = path.join(process.cwd(), ".os-layer");
const JOBS_FILE = path.join(DATA_ROOT, "run-jobs.json");
const WORKSPACES_DIR = path.join(DATA_ROOT, "workspaces");
const JOB_LOG_LIMIT = 120;
const INSTALL_TIMEOUT_MS = 6 * 60 * 1000;
const BUILD_TIMEOUT_MS = 6 * 60 * 1000;
const HEALTH_TIMEOUT_MS = 45 * 1000;
const RUN_PUBLIC_BASE_URL = process.env.RUN_PUBLIC_BASE_URL || "http://localhost:3000";
const RUN_EXECUTOR_MODE = process.env.RUN_EXECUTOR_MODE || "auto";
const DOCKER_START_TIMEOUT_MS = 60 * 1000;
const SECRET_PREFIX = "RUN_SECRET_";

const globalState = globalThis as typeof globalThis & { __osLayerRunState?: RunState };
const state: RunState =
  globalState.__osLayerRunState ||
  (globalState.__osLayerRunState = {
    jobs: new Map<string, StoredRunJob>(),
    processes: new Map<string, ChildProcess>(),
    startCommands: new Map<string, string>(),
    queue: [],
    processing: false,
    loaded: false,
  });

function createDefaultRuntimeProfile(): RuntimeProfile {
  return {
    runtime: "node18",
    framework: "node",
    packageManager: "npm",
    installCommand: "npm install --prefer-offline",
    buildCommand: "npm run build || npm run compile || true",
    startCommand: "npm run start -- --port $PORT",
  };
}

function inferInfraServices(repo: RepoPayload): InfraServiceFlags {
  const source = `${repo.title} ${repo.plainEnglishDescription} ${(repo.topics || []).join(" ")}`.toLowerCase();
  return {
    postgres: source.includes("postgres") || source.includes("prisma") || source.includes("typeorm"),
    redis: source.includes("redis") || source.includes("bullmq") || source.includes("queue"),
  };
}

function inferTemplate(runtime: RuntimeProfile) {
  if (runtime.framework.includes("next")) return "nextjs-web";
  if (runtime.framework.includes("react")) return "react-web";
  if (runtime.runtime.startsWith("python")) return "python-web";
  if (runtime.runtime.startsWith("rust")) return "rust-service";
  return "node-web";
}

function randomToken(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let value = "";
  for (let i = 0; i < length; i += 1) value += chars[Math.floor(Math.random() * chars.length)];
  return value;
}

function buildJobInfra(repo: RepoPayload, profile: RuntimeProfile, options?: RunJobOptions): InfraProfile {
  const inferred = inferInfraServices(repo);
  const template = options?.runtime ? inferTemplate({ ...profile, framework: options.runtime }) : inferTemplate(profile);
  return {
    template,
    services: {
      postgres: options?.services?.postgres ?? inferred.postgres,
      redis: options?.services?.redis ?? inferred.redis,
    },
    envKeys: Object.keys(options?.env || {}),
    secretRefs: (options?.secretRefs || []).filter(Boolean),
  };
}

function resolveInjectedEnv(options?: RunJobOptions) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(options?.env || {})) {
    if (!key) continue;
    result[key] = value;
  }
  for (const ref of options?.secretRefs || []) {
    const envName = `${SECRET_PREFIX}${ref.toUpperCase()}`;
    const value = process.env[envName];
    if (value) result[ref] = value;
  }
  return result;
}

function appendLog(job: StoredRunJob, message: string) {
  job.logs = [...job.logs, `${new Date().toISOString()} ${message}`].slice(-JOB_LOG_LIMIT);
  job.updatedAt = Date.now();
}

async function ensureStorage() {
  await fs.mkdir(WORKSPACES_DIR, { recursive: true });
}

async function saveJobs() {
  await ensureStorage();
  const payload = Array.from(state.jobs.values()).map((job) => ({
    ...job,
    logs: [...job.logs],
  }));
  await fs.writeFile(JOBS_FILE, JSON.stringify(payload, null, 2), "utf8");
}

async function loadJobs() {
  if (state.loaded) return;
  state.loaded = true;
  await ensureStorage();
  try {
    const raw = await fs.readFile(JOBS_FILE, "utf8");
    const parsed: StoredRunJob[] = JSON.parse(raw);
    for (const job of parsed) {
      const restored: StoredRunJob = {
        ...job,
        executor: job.executor || "local",
        targetOrigin: job.targetOrigin || null,
        containerId: job.containerId || null,
        injectedEnv: job.injectedEnv || {},
        serviceContainers: job.serviceContainers || [],
        infraNetwork: job.infraNetwork || null,
        infra: job.infra || {
          template: "node-web",
          services: { postgres: false, redis: false },
          envKeys: [],
          secretRefs: [],
        },
        serviceBindings: job.serviceBindings || {},
      };
      if (restored.stage !== "running" && restored.stage !== "failed") {
        restored.stage = "failed";
        restored.health.status = "degraded";
        appendLog(restored, "Host restarted before job completion.");
      }
      state.jobs.set(restored.id, restored);
    }
  } catch {
  }
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runBinary(
  binary: string,
  args: string[],
  cwd: string,
  job: StoredRunJob,
  timeoutMs: number,
  extraEnv?: Record<string, string>,
) {
  return await new Promise<{ ok: boolean; output: string }>((resolve) => {
    const process = spawn(binary, args, { cwd, env: { ...processEnv(), ...(extraEnv || {}) } });
    let output = "";
    const timer = setTimeout(() => {
      process.kill("SIGTERM");
      resolve({ ok: false, output: `${output}\nTimed out.` });
    }, timeoutMs);

    process.stdout?.on("data", (chunk) => {
      const text = String(chunk).trim();
      if (!text) return;
      output += `${text}\n`;
      appendLog(job, text);
    });

    process.stderr?.on("data", (chunk) => {
      const text = String(chunk).trim();
      if (!text) return;
      output += `${text}\n`;
      appendLog(job, text);
    });

    process.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, output });
    });
  });
}

async function runShell(command: string, cwd: string, job: StoredRunJob, timeoutMs: number, extraEnv?: Record<string, string>) {
  return await new Promise<boolean>((resolve) => {
    appendLog(job, `Running: ${command}`);
    const proc = spawn(command, {
      cwd,
      shell: true,
      env: { ...processEnv(), ...(extraEnv || {}) },
    });

    const timer = setTimeout(() => {
      appendLog(job, `Command timed out: ${command}`);
      proc.kill("SIGTERM");
      resolve(false);
    }, timeoutMs);

    proc.stdout?.on("data", (chunk) => {
      const text = String(chunk).trim();
      if (text) appendLog(job, text);
    });

    proc.stderr?.on("data", (chunk) => {
      const text = String(chunk).trim();
      if (text) appendLog(job, text);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

function processEnv() {
  return { ...process.env, CI: "true", FORCE_COLOR: "0" };
}

function publicAppUrlFor(jobId: string) {
  return `${RUN_PUBLIC_BASE_URL}/api/run/${jobId}/open`;
}

function shellEscape(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function canUseDocker() {
  if (RUN_EXECUTOR_MODE === "local") return false;
  if (RUN_EXECUTOR_MODE === "docker") return true;
  const result = await runBinary("docker", ["--version"], process.cwd(), {
    id: "probe",
    repo: {
      id: 0,
      title: "probe",
      plainEnglishDescription: "",
      stars: 0,
      url: "https://example.com",
    },
    stage: "queued",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    runtime: createDefaultRuntimeProfile(),
    sandbox: { engine: "docker", cpu: "1 vCPU", memoryMb: 512 },
    security: { network: "", filesystem: "" },
    cacheKey: "probe",
    appUrl: null,
    health: { status: "starting", restartCount: 0, lastCheckAt: Date.now() },
    infra: {
      template: "probe",
      services: { postgres: false, redis: false },
      envKeys: [],
      secretRefs: [],
    },
    serviceBindings: {},
    logs: [],
    workspacePath: "",
    port: null,
    executor: "local",
    targetOrigin: null,
    containerId: null,
    injectedEnv: {},
    serviceContainers: [],
    infraNetwork: null,
  }, 5000);
  return result.ok;
}

function choosePort() {
  return 4300 + Math.floor(Math.random() * 900);
}

async function waitForHealthy(port: number) {
  const start = Date.now();
  while (Date.now() - start < HEALTH_TIMEOUT_MS) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}`, { cache: "no-store" });
      if (response.ok || response.status < 500) return true;
    } catch {
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  return false;
}

async function provisionInfraServices(job: StoredRunJob) {
  const bindings: ServiceBindings = {};
  const injected: Record<string, string> = {};
  const services = job.infra.services;
  if (!services.postgres && !services.redis) {
    return { bindings, injected };
  }

  if (job.executor !== "docker") {
    throw new Error("Infra services require docker executor.");
  }

  const networkName = `oslayer-net-${job.id.slice(0, 12)}`;
  await runShell(`docker network create ${networkName}`, DATA_ROOT, job, 20000);
  job.infraNetwork = networkName;

  if (services.postgres) {
    const user = "oslayer";
    const password = randomToken(24);
    const database = "app";
    const containerName = `oslayer-pg-${job.id.slice(0, 10)}`;
    const hostPort = choosePort() + 1000;
    const pgCommand = [
      "docker run -d",
      `--name ${containerName}`,
      `--network ${networkName}`,
      `-e POSTGRES_USER=${user}`,
      `-e POSTGRES_PASSWORD=${password}`,
      `-e POSTGRES_DB=${database}`,
      `-p ${hostPort}:5432`,
      "postgres:16-alpine",
    ].join(" ");
    const ok = await runShell(pgCommand, DATA_ROOT, job, DOCKER_START_TIMEOUT_MS);
    if (ok) {
      job.serviceContainers.push(containerName);
      bindings.postgresUrl = `postgresql://${user}:${password}@${containerName}:5432/${database}`;
      injected.DATABASE_URL = bindings.postgresUrl;
      injected.PGHOST = containerName;
      injected.PGPORT = "5432";
      injected.PGUSER = user;
      injected.PGPASSWORD = password;
      injected.PGDATABASE = database;
      appendLog(job, "Provisioned Postgres dependency service.");
    } else {
      appendLog(job, "Postgres service failed to provision.");
    }
  }

  if (services.redis) {
    const password = randomToken(20);
    const containerName = `oslayer-redis-${job.id.slice(0, 10)}`;
    const hostPort = choosePort() + 2000;
    const redisCommand = [
      "docker run -d",
      `--name ${containerName}`,
      `--network ${job.infraNetwork}`,
      `-p ${hostPort}:6379`,
      "redis:7-alpine",
      `redis-server --requirepass ${password}`,
    ].join(" ");
    const ok = await runShell(redisCommand, DATA_ROOT, job, DOCKER_START_TIMEOUT_MS);
    if (ok) {
      job.serviceContainers.push(containerName);
      bindings.redisUrl = `redis://:${password}@${containerName}:6379`;
      injected.REDIS_URL = bindings.redisUrl;
      appendLog(job, "Provisioned Redis dependency service.");
    } else {
      appendLog(job, "Redis service failed to provision.");
    }
  }

  return { bindings, injected };
}

async function cleanupInfraServices(job: StoredRunJob) {
  for (const container of job.serviceContainers) {
    await runShell(`docker rm -f ${container}`, DATA_ROOT, job, 20000);
  }
  job.serviceContainers = [];
  if (job.infraNetwork) {
    await runShell(`docker network rm ${job.infraNetwork}`, DATA_ROOT, job, 20000);
    job.infraNetwork = null;
  }
}

function setStage(job: StoredRunJob, stage: RunStage) {
  job.stage = stage;
  job.updatedAt = Date.now();
}

async function detectPlan(job: StoredRunJob): Promise<ExecutionPlan> {
  const workspace = job.workspacePath;
  const packageJsonPath = path.join(workspace, "package.json");
  const requirementsPath = path.join(workspace, "requirements.txt");
  const pyprojectPath = path.join(workspace, "pyproject.toml");
  const cargoPath = path.join(workspace, "Cargo.toml");

  if (await exists(packageJsonPath)) {
    const packageJsonRaw = await fs.readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonRaw) as { scripts?: Record<string, string>; dependencies?: Record<string, string> };
    const scripts = packageJson.scripts || {};
    const usesPnpm = await exists(path.join(workspace, "pnpm-lock.yaml"));
    const usesYarn = await exists(path.join(workspace, "yarn.lock"));
    const packageManager = usesPnpm ? "pnpm" : usesYarn ? "yarn" : "npm";
    const runPrefix = packageManager === "npm" ? "npm run" : `${packageManager} run`;
    const installCommand = usesPnpm
      ? "pnpm install --frozen-lockfile || pnpm install"
      : usesYarn
        ? "yarn install --frozen-lockfile || yarn install"
        : "npm install --prefer-offline";
    const buildCommands = scripts.build ? [`${runPrefix} build`] : scripts.compile ? [`${runPrefix} compile`] : ["echo \"No build step required\""];
    const startCommands = [
      scripts.start ? `${runPrefix} start -- --port $PORT` : "",
      scripts.dev ? `${runPrefix} dev -- --port $PORT` : "",
      packageManager === "npm" ? "npx serve . -l $PORT" : `${packageManager} dlx serve . -l $PORT`,
    ].filter(Boolean);

    const framework = packageJson.dependencies?.next ? "nextjs" : packageJson.dependencies?.react ? "react" : "node";

    return {
      profile: {
        runtime: "node18",
        framework,
        packageManager,
        installCommand,
        buildCommand: buildCommands[0],
        startCommand: startCommands[0] || "npm run start -- --port $PORT",
      },
      installCommands: [installCommand],
      buildCommands,
      startCommands,
    };
  }

  if ((await exists(requirementsPath)) || (await exists(pyprojectPath))) {
    return {
      profile: {
        runtime: "python3.11",
        framework: await exists(pyprojectPath) ? "python-poetry" : "python",
        packageManager: "pip",
        installCommand: (await exists(requirementsPath)) ? "pip install -r requirements.txt" : "pip install .",
        buildCommand: "python -m compileall .",
        startCommand: "python app.py",
      },
      installCommands: (await exists(requirementsPath)) ? ["pip install -r requirements.txt"] : ["pip install ."],
      buildCommands: ["python -m compileall ."],
      startCommands: [
        "python app.py --port $PORT",
        "python main.py --port $PORT",
        "uvicorn app:app --host 0.0.0.0 --port $PORT",
        "uvicorn main:app --host 0.0.0.0 --port $PORT",
      ],
    };
  }

  if (await exists(cargoPath)) {
    return {
      profile: {
        runtime: "rust1.80",
        framework: "rust",
        packageManager: "cargo",
        installCommand: "cargo fetch",
        buildCommand: "cargo build --release",
        startCommand: "cargo run --release -- --port $PORT",
      },
      installCommands: ["cargo fetch"],
      buildCommands: ["cargo build --release"],
      startCommands: ["cargo run --release -- --port $PORT"],
    };
  }

  return {
    profile: createDefaultRuntimeProfile(),
    installCommands: ["npm install --prefer-offline"],
    buildCommands: ["npm run build || npm run compile || true"],
    startCommands: ["npm run start -- --port $PORT", "npm run dev -- --port $PORT"],
  };
}

async function runCommandsSequentially(commands: string[], cwd: string, job: StoredRunJob, timeoutMs: number) {
  for (const command of commands) {
    const ok = await runShell(command, cwd, job, timeoutMs);
    if (ok) return command;
    appendLog(job, `Failed command: ${command}`);
  }
  return null;
}

async function runCommandsSequentiallyDocker(commands: string[], cwd: string, job: StoredRunJob, timeoutMs: number) {
  const image =
    job.runtime.runtime.startsWith("python") ? "python:3.11-slim" :
    job.runtime.runtime.startsWith("rust") ? "rust:1.80" :
    "node:20-bullseye";

  for (const command of commands) {
    const envArgs = Object.entries(job.injectedEnv)
      .map(([key, value]) => `-e ${key}=${shellEscape(value)}`)
      .join(" ");
    const networkArg = job.infraNetwork ? `--network ${job.infraNetwork}` : "";
    const dockerCommand = `docker run --rm ${networkArg} ${envArgs} -v ${shellEscape(`${cwd}:/workspace`)} -w /workspace ${image} sh -lc ${shellEscape(command)}`;
    const ok = await runShell(dockerCommand, DATA_ROOT, job, timeoutMs);
    if (ok) return command;
    appendLog(job, `Failed command in docker: ${command}`);
  }
  return null;
}

async function startRuntimeLocal(job: StoredRunJob, commands: string[]) {
  const port = choosePort();
  for (const raw of commands) {
    const command = raw.replace(/\$PORT/g, String(port));
    appendLog(job, `Attempting runtime boot: ${command}`);
    const proc = spawn(command, {
      cwd: job.workspacePath,
      shell: true,
      env: { ...processEnv(), ...job.injectedEnv, PORT: String(port), HOST: "0.0.0.0" },
    });

    proc.stdout?.on("data", (chunk) => {
      const text = String(chunk).trim();
      if (text) appendLog(job, text);
    });
    proc.stderr?.on("data", (chunk) => {
      const text = String(chunk).trim();
      if (text) appendLog(job, text);
    });

    const healthy = await waitForHealthy(port);
    if (healthy) {
      state.processes.set(job.id, proc);
      state.startCommands.set(job.id, command);
      job.port = port;
      job.targetOrigin = `http://127.0.0.1:${port}`;
      job.appUrl = publicAppUrlFor(job.id);
      job.health.status = "healthy";
      job.health.lastCheckAt = Date.now();
      appendLog(job, `Runtime healthy. Handoff URL ready at ${job.appUrl}`);

      proc.on("close", async () => {
        if (job.stage !== "running") return;
        job.health.status = "degraded";
        appendLog(job, "Runtime exited unexpectedly.");
        if (job.health.restartCount < 1) {
          job.health.restartCount += 1;
          appendLog(job, "Attempting auto-restart.");
          const restarted = await startRuntimeLocal(job, [command]);
          if (!restarted) {
            setStage(job, "failed");
            job.appUrl = null;
            appendLog(job, "Auto-restart failed.");
          }
        } else {
          setStage(job, "failed");
          job.appUrl = null;
          appendLog(job, "Runtime failed after restart attempt.");
        }
        await saveJobs();
      });

      return command;
    }

    proc.kill("SIGTERM");
    appendLog(job, `Runtime command did not become healthy: ${command}`);
  }
  return null;
}

async function startRuntimeDocker(job: StoredRunJob, commands: string[]) {
  const port = choosePort();
  const image =
    job.runtime.runtime.startsWith("python") ? "python:3.11-slim" :
    job.runtime.runtime.startsWith("rust") ? "rust:1.80" :
    "node:20-bullseye";
  const containerPort = 3000;

  for (const raw of commands) {
    const command = raw.replace(/\$PORT/g, String(containerPort));
    const envArgs = Object.entries(job.injectedEnv)
      .map(([key, value]) => `-e ${key}=${shellEscape(value)}`)
      .join(" ");
    const networkArg = job.infraNetwork ? `--network ${job.infraNetwork}` : "";
    const dockerCommand = `docker run -d ${networkArg} ${envArgs} -p ${port}:${containerPort} -v ${shellEscape(`${job.workspacePath}:/workspace`)} -w /workspace ${image} sh -lc ${shellEscape(command)}`;
    appendLog(job, `Attempting docker runtime boot: ${command}`);

    const start = await runShell(`${dockerCommand} > /tmp/os-layer-${job.id}.cid`, DATA_ROOT, job, DOCKER_START_TIMEOUT_MS);
    if (!start) {
      appendLog(job, "Docker runtime start command failed.");
      continue;
    }

    const cidPath = `/tmp/os-layer-${job.id}.cid`;
    let containerId = "";
    try {
      containerId = (await fs.readFile(cidPath, "utf8")).trim();
    } catch {
      containerId = "";
    }
    if (!containerId) {
      appendLog(job, "Docker returned empty container id.");
      continue;
    }

    const healthy = await waitForHealthy(port);
    if (healthy) {
      job.containerId = containerId;
      job.port = port;
      job.targetOrigin = `http://127.0.0.1:${port}`;
      job.appUrl = publicAppUrlFor(job.id);
      job.health.status = "healthy";
      job.health.lastCheckAt = Date.now();
      appendLog(job, `Docker runtime healthy. Handoff URL ready at ${job.appUrl}`);
      return command;
    }

    appendLog(job, "Docker runtime did not become healthy in time. Cleaning up container.");
    await runShell(`docker rm -f ${containerId}`, DATA_ROOT, job, 15000);
  }

  return null;
}

async function executeJob(jobId: string) {
  const job = state.jobs.get(jobId);
  if (!job) return;

  const workspacePath = path.join(WORKSPACES_DIR, job.id);
  job.workspacePath = workspacePath;
  job.port = null;
  job.targetOrigin = null;
  job.containerId = null;
  job.serviceBindings = {};
  job.serviceContainers = [];
  job.infraNetwork = null;

  try {
    const useDocker = await canUseDocker();
    job.executor = useDocker ? "docker" : "local";
    job.sandbox.engine = useDocker ? "docker" : "firecracker";
    setStage(job, "detecting");
    appendLog(job, "Provisioning isolated workspace.");
    await fs.rm(workspacePath, { recursive: true, force: true });
    await fs.mkdir(workspacePath, { recursive: true });
    await saveJobs();

    appendLog(job, `Cloning repository ${job.repo.url}`);
    const clone = await runBinary("git", ["clone", "--depth", "1", job.repo.url, workspacePath], DATA_ROOT, job, 3 * 60 * 1000);
    if (!clone.ok) {
      throw new Error("Repository clone failed.");
    }

    const plan = await detectPlan(job);
    job.runtime = plan.profile;
    job.infra.template = inferTemplate(plan.profile);
    appendLog(job, `Detected ${plan.profile.framework} runtime on ${plan.profile.runtime}.`);

    const provisioned = await provisionInfraServices(job);
    job.serviceBindings = provisioned.bindings;
    job.injectedEnv = {
      ...job.injectedEnv,
      ...provisioned.injected,
    };
    await saveJobs();

    setStage(job, "installing");
    const installCommand = useDocker
      ? await runCommandsSequentiallyDocker(plan.installCommands, workspacePath, job, INSTALL_TIMEOUT_MS)
      : await runCommandsSequentially(plan.installCommands, workspacePath, job, INSTALL_TIMEOUT_MS);
    if (!installCommand) throw new Error("Dependency installation failed.");
    job.runtime.installCommand = installCommand;
    await saveJobs();

    setStage(job, "building");
    const buildCommand = useDocker
      ? await runCommandsSequentiallyDocker(plan.buildCommands, workspacePath, job, BUILD_TIMEOUT_MS)
      : await runCommandsSequentially(plan.buildCommands, workspacePath, job, BUILD_TIMEOUT_MS);
    if (buildCommand) {
      job.runtime.buildCommand = buildCommand;
    } else {
      appendLog(job, "Build failed for all known commands. Continuing with runtime bootstrap.");
    }
    await saveJobs();

    const startCommand = useDocker
      ? await startRuntimeDocker(job, plan.startCommands)
      : await startRuntimeLocal(job, plan.startCommands);
    if (!startCommand) throw new Error("Runtime boot failed for all known commands.");
    job.runtime.startCommand = startCommand;
    setStage(job, "running");
    appendLog(job, "Run Cloud handoff is ready.");
    await saveJobs();
  } catch (error) {
    setStage(job, "failed");
    job.health.status = "degraded";
    job.appUrl = null;
    job.targetOrigin = null;
    await cleanupInfraServices(job);
    appendLog(job, error instanceof Error ? error.message : "Unknown runtime failure.");
    await saveJobs();
  }
}

async function processQueue() {
  if (state.processing) return;
  state.processing = true;
  while (state.queue.length > 0) {
    const next = state.queue.shift();
    if (!next) continue;
    await executeJob(next);
  }
  state.processing = false;
}

function enqueueJob(jobId: string) {
  if (state.queue.includes(jobId)) return;
  state.queue.push(jobId);
  processQueue();
}

function snapshot(job: StoredRunJob): RunJob {
  return {
    id: job.id,
    repo: job.repo,
    stage: job.stage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    runtime: { ...job.runtime },
    sandbox: { ...job.sandbox },
    security: { ...job.security },
    cacheKey: job.cacheKey,
    appUrl: job.appUrl,
    health: { ...job.health },
    infra: {
      ...job.infra,
      services: { ...job.infra.services },
      envKeys: [...job.infra.envKeys],
      secretRefs: [...job.infra.secretRefs],
    },
    serviceBindings: { ...job.serviceBindings },
    logs: [...job.logs],
  };
}

export async function createRunJob(repo: RepoPayload, options?: RunJobOptions) {
  await loadJobs();
  const now = Date.now();
  const profile = createDefaultRuntimeProfile();
  const id = randomUUID();
  const job: StoredRunJob = {
    id,
    repo,
    stage: "queued",
    createdAt: now,
    updatedAt: now,
    runtime: { ...profile, framework: options?.runtime || profile.framework },
    sandbox: {
      engine: "firecracker",
      cpu: "2 vCPU",
      memoryMb: 4096,
    },
    security: {
      network: "egress allowlisted + inbound proxied",
      filesystem: "ephemeral rootfs + read-only repo clone",
    },
    cacheKey: `repo:${repo.id}:${profile.runtime}:${profile.packageManager}`,
    appUrl: null,
    health: {
      status: "starting",
      restartCount: 0,
      lastCheckAt: now,
    },
    infra: buildJobInfra(repo, profile, options),
    serviceBindings: {},
    logs: [],
    workspacePath: "",
    port: null,
    executor: RUN_EXECUTOR_MODE === "docker" ? "docker" : "local",
    targetOrigin: null,
    containerId: null,
    injectedEnv: resolveInjectedEnv(options),
    serviceContainers: [],
    infraNetwork: null,
  };
  appendLog(job, "Job accepted into Run Cloud queue.");
  state.jobs.set(id, job);
  await saveJobs();
  enqueueJob(id);
  return snapshot(job);
}

export async function getRunJob(id: string) {
  await loadJobs();
  const job = state.jobs.get(id);
  if (!job) return null;
  return snapshot(job);
}

export async function listRunJobs() {
  await loadJobs();
  return Array.from(state.jobs.values())
    .map((job) => snapshot(job))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getRunJobTarget(jobId: string) {
  await loadJobs();
  const job = state.jobs.get(jobId);
  if (!job || !job.targetOrigin || job.stage !== "running") return null;
  return {
    targetOrigin: job.targetOrigin,
    appUrl: job.appUrl,
  };
}
