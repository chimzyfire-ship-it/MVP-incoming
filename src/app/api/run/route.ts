import { NextResponse } from "next/server";
import { detectRuntime } from '@/lib/runtimes';

import { createRunJob, listRunJobs } from "./store";

interface RunRequestBody {
  repo?: {
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
  };
  options?: {
    env?: Record<string, string>;
    secretRefs?: string[];
    services?: {
      postgres?: boolean;
      redis?: boolean;
    };
  };
}

export async function GET() {
  const jobs = await listRunJobs();
  return NextResponse.json(jobs);
}

export async function POST(request: Request) {
  try {
    const body: RunRequestBody = await request.json();
    const repo = body.repo;

    if (!repo || typeof repo.id !== 'number' || !repo.title || !repo.url) {
      return NextResponse.json({ error: 'Invalid repo payload' }, { status: 400 });
    }

    // TODO: In a real implementation, we would clone the repo here and get the file list.
    // For now, we'll simulate it to test the runtime detection.
    const repoFiles = ['package.json', 'next.config.js', 'README.md'];
    const runtime = detectRuntime(repoFiles);

    const optionsWithRuntime = {
      ...body.options,
      runtime: runtime ? runtime.id : 'unknown',
    };

    const created = await createRunJob(repo, optionsWithRuntime);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
