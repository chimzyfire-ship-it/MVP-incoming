import { promises as fs } from 'fs';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InfraTarget = 'fal' | 'modal' | 'railway' | 'fly' | 'groq' | 'unknown';

export interface RepoAnalysis {
  /** Absolute path to the cloned repository on disk */
  repoDir: string;

  // ── Runtime detection ───────────────────────────────────────────────────────
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  hasPackageJson: boolean;
  hasRequirementsTxt: boolean;
  hasPyproject: boolean;
  hasCargoToml: boolean;
  hasGoMod: boolean;
  hasGemfile: boolean;

  // ── Framework / language hints ──────────────────────────────────────────────
  primaryLanguage: 'node' | 'python' | 'rust' | 'go' | 'ruby' | 'unknown';
  framework: string; // 'nextjs' | 'fastapi' | 'flask' | 'express' | 'react' | ...

  // ── Service needs (inferred from README + docker-compose) ───────────────────
  needsPostgres: boolean;
  needsRedis: boolean;
  needsMongo: boolean;
  needsGpu: boolean; // flag if repo mentions GPU / CUDA / torch

  // ── Env-var hints ───────────────────────────────────────────────────────────
  /** Keys found in .env.example or .env.sample */
  envExampleKeys: string[];

  // ── Which infrastructure partner best fits this repo ───────────────────────
  /** Recommended infra target based on static signals */
  recommendedInfra: InfraTarget;

  // ── Raw content (truncated) for passing to LLM later ───────────────────────
  readmeSnippet: string;   // first 2 000 chars
  packageJsonRaw: string | null;
  dockerfileRaw: string | null;
  envExampleRaw: string | null;

  // ── Port ────────────────────────────────────────────────────────────────────
  exposedPort: number | null; // parsed from Dockerfile EXPOSE or docker-compose

  // ── Errors encountered during analysis (non-fatal) ─────────────────────────
  warnings: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function tryRead(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch {
    return null;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseEnvKeys(raw: string): string[] {
  const keys: string[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=/);
    if (match?.[1]) keys.push(match[1]);
  }
  return keys;
}

function parseExposedPort(dockerfileRaw: string): number | null {
  const match = dockerfileRaw.match(/^EXPOSE\s+(\d+)/m);
  if (match?.[1]) return parseInt(match[1], 10);
  return null;
}

function inferInfraTarget(analysis: Partial<RepoAnalysis>): InfraTarget {
  const readme = (analysis.readmeSnippet || '').toLowerCase();
  const framework = (analysis.framework || '').toLowerCase();

  // GPU tools → FAL.ai or Modal
  if (analysis.needsGpu) {
    // If it's a Python ML tool → Modal (more flexible compute)
    if (analysis.primaryLanguage === 'python') return 'modal';
    return 'fal';
  }

  // LLM / chat tools → Groq
  if (/\b(llm|llama|openai|chat|inference|embedding|groq)\b/.test(readme)) return 'groq';

  // Image / video generation → FAL.ai
  if (/\b(image.gen|text.to.image|diffusion|flux|sdxl|comfyui|video.gen|wan)\b/.test(readme)) return 'fal';

  // Web apps, dashboards, APIs → Railway
  if (
    framework.includes('next') ||
    framework.includes('react') ||
    framework.includes('express') ||
    framework.includes('fastapi') ||
    framework.includes('flask') ||
    analysis.hasDockerCompose
  ) return 'railway';

  // Has a Dockerfile and is a Node/Python service → Fly.io
  if (analysis.hasDockerfile) return 'fly';

  // Default
  return 'railway';
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Stage 1 — Static Analysis.
 *
 * Reads the cloned repo at `repoDir` and returns a structured `RepoAnalysis`.
 * This runs entirely on-disk with no network calls.
 */
export async function analyzeRepo(repoDir: string): Promise<RepoAnalysis> {
  const warnings: string[] = [];

  // ── Detect files ────────────────────────────────────────────────────────────
  const [
    hasDockerfile,
    hasDockerCompose,
    hasPackageJson,
    hasRequirementsTxt,
    hasPyproject,
    hasCargoToml,
    hasGoMod,
    hasGemfile,
  ] = await Promise.all([
    fileExists(path.join(repoDir, 'Dockerfile')),
    fileExists(path.join(repoDir, 'docker-compose.yml')) ||
      fileExists(path.join(repoDir, 'docker-compose.yaml')),
    fileExists(path.join(repoDir, 'package.json')),
    fileExists(path.join(repoDir, 'requirements.txt')),
    fileExists(path.join(repoDir, 'pyproject.toml')),
    fileExists(path.join(repoDir, 'Cargo.toml')),
    fileExists(path.join(repoDir, 'go.mod')),
    fileExists(path.join(repoDir, 'Gemfile')),
  ]);

  // ── Read key files ───────────────────────────────────────────────────────────
  const [
    readmeFull,
    packageJsonRaw,
    dockerfileRaw,
    envExampleRaw,
    requirementsRaw,
  ] = await Promise.all([
    tryRead(path.join(repoDir, 'README.md')) ||
      tryRead(path.join(repoDir, 'readme.md')) ||
      tryRead(path.join(repoDir, 'README')),
    hasPackageJson ? tryRead(path.join(repoDir, 'package.json')) : null,
    hasDockerfile ? tryRead(path.join(repoDir, 'Dockerfile')) : null,
    tryRead(path.join(repoDir, '.env.example')) ||
      tryRead(path.join(repoDir, '.env.sample')) ||
      tryRead(path.join(repoDir, '.env.template')),
    hasRequirementsTxt ? tryRead(path.join(repoDir, 'requirements.txt')) : null,
  ]);

  const readmeSnippet = readmeFull ? readmeFull.slice(0, 2000) : '';
  const combinedText = `${readmeSnippet} ${requirementsRaw || ''} ${packageJsonRaw || ''}`.toLowerCase();

  // ── Detect primary language ─────────────────────────────────────────────────
  let primaryLanguage: RepoAnalysis['primaryLanguage'] = 'unknown';
  if (hasPackageJson) primaryLanguage = 'node';
  else if (hasRequirementsTxt || hasPyproject) primaryLanguage = 'python';
  else if (hasCargoToml) primaryLanguage = 'rust';
  else if (hasGoMod) primaryLanguage = 'go';
  else if (hasGemfile) primaryLanguage = 'ruby';

  // ── Detect framework ────────────────────────────────────────────────────────
  let framework = 'unknown';
  if (packageJsonRaw) {
    try {
      const pkg = JSON.parse(packageJsonRaw) as { dependencies?: Record<string, string> };
      const deps = Object.keys(pkg.dependencies || {}).join(' ');
      if (deps.includes('next')) framework = 'nextjs';
      else if (deps.includes('react')) framework = 'react';
      else if (deps.includes('express')) framework = 'express';
      else if (deps.includes('fastify')) framework = 'fastify';
      else if (deps.includes('koa')) framework = 'koa';
      else if (primaryLanguage === 'node') framework = 'node';
    } catch {
      warnings.push('Could not parse package.json as JSON.');
    }
  }
  if (framework === 'unknown' && primaryLanguage === 'python') {
    if (combinedText.includes('fastapi')) framework = 'fastapi';
    else if (combinedText.includes('flask')) framework = 'flask';
    else if (combinedText.includes('django')) framework = 'django';
    else if (combinedText.includes('streamlit')) framework = 'streamlit';
    else if (combinedText.includes('gradio')) framework = 'gradio';
    else framework = 'python';
  }

  // ── Detect service needs ────────────────────────────────────────────────────
  const needsPostgres = /\b(postgres|postgresql|pg|neon|supabase|prisma|typeorm)\b/.test(combinedText);
  const needsRedis = /\b(redis|bullmq|celery|rq\b|queue)\b/.test(combinedText);
  const needsMongo = /\b(mongo|mongodb|mongoose)\b/.test(combinedText);
  const needsGpu = /\b(cuda|gpu|torch|torchvision|diffusers|xformers|bitsandbytes|nvidia|h100|a100)\b/.test(combinedText);

  // ── Parse .env.example keys ─────────────────────────────────────────────────
  const envExampleKeys = envExampleRaw ? parseEnvKeys(envExampleRaw) : [];

  // ── Parse exposed port ───────────────────────────────────────────────────────
  const exposedPort = dockerfileRaw ? parseExposedPort(dockerfileRaw) : null;

  // ── Build partial analysis for infra targeting ─────────────────────────────
  const partial: Partial<RepoAnalysis> = {
    primaryLanguage,
    framework,
    needsGpu,
    hasDockerfile,
    hasDockerCompose,
    readmeSnippet,
  };

  const recommendedInfra = inferInfraTarget(partial);

  return {
    repoDir,
    hasDockerfile,
    hasDockerCompose,
    hasPackageJson,
    hasRequirementsTxt,
    hasPyproject,
    hasCargoToml,
    hasGoMod,
    hasGemfile,
    primaryLanguage,
    framework,
    needsPostgres,
    needsRedis,
    needsMongo,
    needsGpu,
    envExampleKeys,
    recommendedInfra,
    readmeSnippet,
    packageJsonRaw,
    dockerfileRaw,
    envExampleRaw,
    exposedPort,
    warnings,
  };
}
