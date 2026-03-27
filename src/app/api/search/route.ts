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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=100`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) throw new Error("GitHub API failed");

    const data: GitHubSearchResponse = await res.json();

    const mapped = (data.items || []).map((repo) => ({
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
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
