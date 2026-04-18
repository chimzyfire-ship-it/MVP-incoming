import { promises as fs } from 'fs';
import path from 'path';
import type { RepoAnalysis } from './analyzer.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeployConfig {
  /** App name safe for Fly.io / Railway */
  appName: string;

  /** Resolved environment variables with sensible defaults */
  env: Record<string, string>;

  /** Build strategy in priority order — we try each in Stage 3 */
  buildStrategy: ('existing-dockerfile' | 'nixpacks' | 'generated-dockerfile')[];

  /** The generated Dockerfile content (written to disk if no Dockerfile exists) */
  generatedDockerfile: string | null;

  /** Port the app listens on */
  port: number;

  /** Additional install commands to run before build (e.g. pip install extras) */
  preInstallCommands: string[];

  /** Human-readable summary of what was inferred (for logs) */
  summary: string[];
}

// ─── Dockerfile Templates ─────────────────────────────────────────────────────

function nodeDockerfile(port: number): string {
  return `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --prefer-offline
COPY . .
RUN npm run build 2>/dev/null || true
EXPOSE ${port}
ENV PORT=${port}
CMD ["sh", "-c", "npm run start 2>/dev/null || npm run dev 2>/dev/null || npx serve . -l ${port}"]
`;
}

function pythonDockerfile(port: number, hasRequirements: boolean): string {
  return `FROM python:3.11-slim
WORKDIR /app
${hasRequirements ? 'COPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt' : 'COPY pyproject.toml .\nRUN pip install --no-cache-dir .'}
COPY . .
EXPOSE ${port}
ENV PORT=${port}
CMD ["sh", "-c", "python app.py 2>/dev/null || uvicorn main:app --host 0.0.0.0 --port ${port} 2>/dev/null || python main.py"]
`;
}

function gradioDockerfile(port: number): string {
  return `FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir gradio
COPY requirements.txt . 2>/dev/null || true
RUN pip install --no-cache-dir -r requirements.txt 2>/dev/null || true
COPY . .
EXPOSE ${port}
ENV PORT=${port}
CMD ["python", "app.py"]
`;
}

function streamlitDockerfile(port: number): string {
  return `FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir streamlit
COPY requirements.txt . 2>/dev/null || true
RUN pip install --no-cache-dir -r requirements.txt 2>/dev/null || true
COPY . .
EXPOSE ${port}
CMD ["streamlit", "run", "app.py", "--server.port", "${port}", "--server.address", "0.0.0.0"]
`;
}

function rustDockerfile(port: number): string {
  return `FROM rust:1.80-slim as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/* ./
EXPOSE ${port}
ENV PORT=${port}
CMD ["./app"]
`;
}

// ─── Env Defaults ────────────────────────────────────────────────────────────

/**
 * For each key in .env.example, try to infer a sensible default.
 * These are NON-SECRET defaults that just allow the app to boot.
 */
function inferEnvDefaults(keys: string[], port: number): Record<string, string> {
  const defaults: Record<string, string> = {
    PORT: String(port),
    NODE_ENV: 'production',
    HOST: '0.0.0.0',
  };

  for (const key of keys) {
    if (key in defaults) continue;

    const lower = key.toLowerCase();

    // Skip secrets — we don't want to fake them
    if (/secret|password|token|key|api_key|private/i.test(lower)) continue;

    // Common safe defaults
    if (lower.includes('host')) defaults[key] = '0.0.0.0';
    else if (lower.includes('port')) defaults[key] = String(port);
    else if (lower.includes('debug')) defaults[key] = 'false';
    else if (lower.includes('log_level')) defaults[key] = 'info';
    else if (lower.includes('env')) defaults[key] = 'production';
    else if (lower.includes('base_url') || lower.includes('public_url')) defaults[key] = `http://localhost:${port}`;
    else if (lower.includes('allowed_host') || lower.includes('cors')) defaults[key] = '*';
    else if (lower.includes('max_upload') || lower.includes('file_size')) defaults[key] = '50mb';
  }

  return defaults;
}

// ─── App Name ────────────────────────────────────────────────────────────────

function sanitizeAppName(raw: string, repoId: string): string {
  const base = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  return `gm-${base || repoId.slice(0, 10)}`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Stage 2 — Configuration Generation.
 *
 * Takes the static analysis from Stage 1 and generates a complete deploy config:
 * - Env variables with sensible defaults (no secrets guessed)
 * - Build strategy priority list
 * - A generated Dockerfile written to disk if no Dockerfile exists
 * - The port to use
 */
export async function generateConfig(
  analysis: RepoAnalysis,
  repoTitle: string,
  repoId: string,
): Promise<DeployConfig> {
  const summary: string[] = [];
  const port = analysis.exposedPort || 3000;
  const appName = sanitizeAppName(repoTitle, repoId);

  // ── Build strategy ──────────────────────────────────────────────────────────
  const buildStrategy: DeployConfig['buildStrategy'] = [];

  if (analysis.hasDockerfile) {
    buildStrategy.push('existing-dockerfile');
    summary.push('✓ Dockerfile found — using as primary build strategy.');
  }

  // Nixpacks works for Node and Python projects equally well
  if (analysis.hasPackageJson || analysis.hasRequirementsTxt || analysis.hasPyproject) {
    buildStrategy.push('nixpacks');
    summary.push('✓ Nixpacks auto-detection available as fallback.');
  }

  // Always have a generated Dockerfile as the last resort
  buildStrategy.push('generated-dockerfile');

  // ── Generate a Dockerfile if we don't already have one ────────────────────
  let generatedDockerfile: string | null = null;

  if (!analysis.hasDockerfile) {
    switch (analysis.framework) {
      case 'gradio':
        generatedDockerfile = gradioDockerfile(port);
        summary.push('⚡ Generated Gradio Dockerfile (last-resort fallback).');
        break;
      case 'streamlit':
        generatedDockerfile = streamlitDockerfile(port);
        summary.push('⚡ Generated Streamlit Dockerfile (last-resort fallback).');
        break;
      case 'nextjs':
      case 'react':
      case 'express':
      case 'node':
      case 'fastify':
        generatedDockerfile = nodeDockerfile(port);
        summary.push('⚡ Generated Node.js Dockerfile (last-resort fallback).');
        break;
      case 'fastapi':
      case 'flask':
      case 'django':
      case 'python':
        generatedDockerfile = pythonDockerfile(port, analysis.hasRequirementsTxt);
        summary.push('⚡ Generated Python Dockerfile (last-resort fallback).');
        break;
      case 'rust':
        generatedDockerfile = rustDockerfile(port);
        summary.push('⚡ Generated Rust Dockerfile (last-resort fallback).');
        break;
      default:
        // Default to Node as the broadest fallback
        generatedDockerfile = nodeDockerfile(port);
        summary.push('⚡ Generated generic Node.js Dockerfile (unknown framework).');
    }
  }

  // ── Env variables ───────────────────────────────────────────────────────────
  const env = inferEnvDefaults(analysis.envExampleKeys, port);

  if (analysis.needsPostgres) {
    summary.push('⚠ Repo appears to need PostgreSQL — a DATABASE_URL will be required.');
  }
  if (analysis.needsRedis) {
    summary.push('⚠ Repo appears to need Redis — a REDIS_URL will be required.');
  }
  if (analysis.needsGpu) {
    summary.push('⚠ Repo appears to need a GPU — Fly.io CPU deploy may fail. Consider Modal.');
  }

  // ── Pre-install commands ────────────────────────────────────────────────────
  const preInstallCommands: string[] = [];

  if (analysis.primaryLanguage === 'python') {
    // Ensure pip is up to date first
    preInstallCommands.push('pip install --upgrade pip');
  }

  // ── Write generated Dockerfile to disk so Stage 3 can use it ───────────────
  if (generatedDockerfile && !analysis.hasDockerfile) {
    const dockerfilePath = path.join(analysis.repoDir, 'Dockerfile');
    // Only write it now if Stage 3 escalates to 'generated-dockerfile'
    // We store it in memory here and write on demand in worker.ts
    summary.push(`Generated Dockerfile ready to write to: ${dockerfilePath}`);
  }

  summary.push(`App name: ${appName} | Port: ${port} | Infra target: ${analysis.recommendedInfra}`);

  return {
    appName,
    env,
    buildStrategy,
    generatedDockerfile,
    port,
    preInstallCommands,
    summary,
  };
}

/**
 * Write the generated Dockerfile to disk (called by worker.ts in Stage 3
 * when escalating to the 'generated-dockerfile' strategy).
 */
export async function writeGeneratedDockerfile(
  repoDir: string,
  content: string,
): Promise<void> {
  await fs.writeFile(path.join(repoDir, 'Dockerfile'), content, 'utf8');
}
