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
    coverImage: repo.owner?.login ? `https://opengraph.githubassets.com/1/${repo.owner.login}/${repo.name}` : undefined,
    topics: repo.topics || [],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "discover";
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

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

  const urls = catalog[category] || catalog.discover;

  try {
    const responses = await Promise.all(
      urls.map((url) =>
        fetch(url, {
          headers: { Accept: "application/vnd.github.v3+json" },
          next: { revalidate: 3600 },
        }),
      ),
    );

    const failed = responses.find((res) => !res.ok);
    if (failed) throw new Error("GitHub API failed");

    const payloads: GitHubSearchResponse[] = await Promise.all(responses.map((res) => res.json() as Promise<GitHubSearchResponse>));
    const deduped = new Map<number, GitHubRepo>();

    for (const payload of payloads) {
      for (const item of payload.items || []) {
        if (!deduped.has(item.id)) deduped.set(item.id, item);
      }
    }

    const mapped = Array.from(deduped.values()).map(mapRepo);

    return NextResponse.json(mapped);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch trending" }, { status: 500 });
  }
}
