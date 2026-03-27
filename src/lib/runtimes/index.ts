
import { nextjsRuntime } from './nextjs';

export interface Runtime {
  id: string;
  name: string;
  detect: (files: string[]) => boolean;
  generateDockerfile: (files: string[]) => string;
}

const runtimes: Runtime[] = [nextjsRuntime];

export const detectRuntime = (files: string[]): Runtime | null => {
  for (const runtime of runtimes) {
    if (runtime.detect(files)) {
      return runtime;
    }
  }
  return null;
};
