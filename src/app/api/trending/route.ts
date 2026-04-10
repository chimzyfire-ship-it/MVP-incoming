import { NextResponse } from "next/server";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count?: number;
  html_url: string;
  language: string | null;
  owner?: { login?: string; avatar_url?: string };
  topics?: string[];
}

interface GitHubSearchResponse {
  items?: GitHubRepo[];
}

// ── Curated list of repos that are known to start successfully ────────────
// Selection criteria: has package.json + npm start (or Python/Flask),
// no mandatory API keys, no mandatory database, well-maintained.
const CURATED_RUNNABLE_NAMES = new Set([
  "withastro/astro",
  "vercel/next.js",
  "facebook/create-react-app",
  "vuejs/vue",
  "sveltejs/svelte",
  "nuxt/nuxt",
  "tiangolo/fastapi",
  "pallets/flask",
  "expressjs/express",
  "nestjs/nest",
  "remix-run/remix",
  "solidjs/solid",
  "preactjs/preact",
  "alpinejs/alpine",
  "hotwired/turbo",
  "trpc/trpc",
  "t3-oss/create-t3-app",
  "calcom/cal.com",
  "steven-tey/novel",
  "steven-tey/dub",
  "shadcn-ui/ui",
  "airbyte/airbyte",
  "makeplane/plane",
  "twentyhq/twenty",
  "documenso/documenso",
  "lobehub/lobe-chat",
  "open-webui/open-webui",
  "excalidraw/excalidraw",
  "tldraw/tldraw",
  "maybe-finance/maybe",
]);

function isLikelyRunnable(repo: GitHubRepo): boolean {
  const lang = (repo.language || "").toLowerCase();
  const desc = (repo.description || "").toLowerCase();
  const topics = repo.topics || [];

  // Strongly positive signals
  if (CURATED_RUNNABLE_NAMES.has(repo.full_name.toLowerCase())) return true;
  if (topics.includes("nextjs") || topics.includes("next-js")) return true;
  if (topics.includes("react") && lang === "typescript") return true;
  if (topics.includes("flask") || topics.includes("fastapi")) return true;
  if (topics.includes("express") || topics.includes("expressjs")) return true;
  if (lang === "javascript" && (desc.includes("starter") || desc.includes("demo") || desc.includes("template"))) return true;

  // Negative signals — repos needing complex setup
  if (topics.includes("kubernetes") || topics.includes("k8s")) return false;
  if (topics.includes("machine-learning") || topics.includes("deep-learning")) return false;
  if (desc.includes("requires") && desc.includes("api key")) return false;

  return false;
}

function mapRepo(repo: GitHubRepo) {
  return {
    id: repo.id,
    title: repo.name,
    fullName: repo.full_name,
    plainEnglishDescription: repo.description || "No description provided.",
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    collaborators: typeof repo.watchers_count === "number" ? repo.watchers_count : 0,
    url: repo.html_url,
    language: repo.language || "Unknown",
    owner: repo.owner?.login || "unknown",
    avatar: repo.owner?.avatar_url || "",
    coverImage: repo.owner?.login
      ? `https://opengraph.githubassets.com/1/${repo.owner.login}/${repo.name}`
      : undefined,
    topics: repo.topics || [],
    easyToRun: isLikelyRunnable(repo),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "discover";
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Curated runnable repos fetched individually (guaranteed rich metadata)
  const CURATED_RUNNABLE_URLS = Array.from(CURATED_RUNNABLE_NAMES).map(
    (fullName) => `https://api.github.com/repos/${fullName}`,
  );

  // Build GitHub request headers — include auth token when available
  // (raises rate-limit from 60 → 5,000 req/hour, preventing 403s in prod)
  function ghHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
    const token = process.env.GITHUB_TOKEN;
    if (token) headers["Authorization"] = `token ${token}`;
    return headers;
  }

  // Standard search-based catalog
  const catalog: Record<string, string[]> = {
    discover: [
      `https://api.github.com/search/repositories?q=${encodeURIComponent(`stars:>7000 pushed:>${monthAgo}`)}&sort=stars&order=desc&per_page=100&page=1`,
      `https://api.github.com/search/repositories?q=${encodeURIComponent(`stars:>7000 pushed:>${monthAgo}`)}&sort=stars&order=desc&per_page=100&page=2`,
      `https://api.github.com/search/repositories?q=${encodeURIComponent(`created:>${weekAgo}`)}&sort=stars&order=desc&per_page=100&page=1`,
    ],
    shop: [
      `https://api.github.com/search/repositories?q=${encodeURIComponent(`stars:>3000 archived:false`)}&sort=stars&order=desc&per_page=100&page=1`,
      `https://api.github.com/search/repositories?q=${encodeURIComponent(`stars:>3000 archived:false`)}&sort=stars&order=desc&per_page=100&page=2`,
    ],
    categories: [
      `https://api.github.com/search/repositories?q=${encodeURIComponent(`stars:>3500 pushed:>${monthAgo}`)}&sort=stars&order=desc&per_page=100&page=1`,
      `https://api.github.com/search/repositories?q=${encodeURIComponent(`stars:>3500 pushed:>${monthAgo}`)}&sort=stars&order=desc&per_page=100&page=2`,
    ],
    trending: [
      `https://api.github.com/search/repositories?q=${encodeURIComponent(`created:>${weekAgo}`)}&sort=stars&order=desc&per_page=100&page=1`,
      `https://api.github.com/search/repositories?q=${encodeURIComponent(`created:>${weekAgo}`)}&sort=stars&order=desc&per_page=100&page=2`,
    ],
  };

  try {
    // ── "Runnable" tab: only return the curated list ──────────────────────
    if (category === "runnable") {
      const responses = await Promise.allSettled(
        CURATED_RUNNABLE_URLS.map((url) =>
          fetch(url, {
            headers: ghHeaders(),
            next: { revalidate: 3600 },
          }),
        ),
      );

      const repos: GitHubRepo[] = [];
      for (const res of responses) {
        if (res.status === "fulfilled" && res.value.ok) {
          const data = (await res.value.json()) as GitHubRepo;
          if (data && data.id) repos.push(data);
        }
      }

      const mapped = repos.map(mapRepo);
      return NextResponse.json(mapped);
    }

    // ── All other tabs: search-based fetch ────────────────────────────────
    const urls = catalog[category] ?? catalog.discover;

    const responses = await Promise.all(
      urls.map((url) =>
        fetch(url, {
          headers: ghHeaders(),
          next: { revalidate: 3600 },
        }),
      ),
    );

    const failed = responses.find((res) => !res.ok);
    if (failed) throw new Error("GitHub API failed");

    const payloads: GitHubSearchResponse[] = await Promise.all(
      responses.map((res) => res.json() as Promise<GitHubSearchResponse>),
    );

    const deduped = new Map<number, GitHubRepo>();
    for (const payload of payloads) {
      for (const item of payload.items || []) {
        if (!deduped.has(item.id)) deduped.set(item.id, item);
      }
    }

    // For "discover": also fetch and merge the curated runnable repos
    // so they always appear even if not in the trending results
    if (category === "discover") {
      const curatedResponses = await Promise.allSettled(
        CURATED_RUNNABLE_URLS.map((url) =>
          fetch(url, {
            headers: ghHeaders(),
            next: { revalidate: 3600 },
          }),
        ),
      );
      for (const res of curatedResponses) {
        if (res.status === "fulfilled" && res.value.ok) {
          const data = (await res.value.json()) as GitHubRepo;
          if (data && data.id && !deduped.has(data.id)) {
            deduped.set(data.id, data);
          }
        }
      }
    }

    const mapped = Array.from(deduped.values()).map(mapRepo);

    // Sort "discover" so easy-to-run repos float to the top
    if (category === "discover") {
      mapped.sort((a, b) => {
        const aScore = (a.easyToRun ? 1 : 0);
        const bScore = (b.easyToRun ? 1 : 0);
        if (bScore !== aScore) return bScore - aScore;
        return b.stars - a.stars;
      });
    }

    return NextResponse.json(mapped);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch trending" },
      { status: 500 },
    );
  }
}
