import { NextResponse } from "next/server";

import { getRunJob, deleteRunJob } from "../store";

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const job = await getRunJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}

export async function DELETE(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  
  try {
    await deleteRunJob(jobId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to delete job ${jobId}:`, error);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}

