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
  const isSingleWord = !q.includes(" ");

  try {
    const fetchPromises = [
      fetch(url, { headers: { Accept: "application/vnd.github.v3+json" } })
    ];

    if (isSingleWord) {
      const userReposUrl = `https://api.github.com/users/${encodeURIComponent(q)}/repos?sort=updated&per_page=50`;
      fetchPromises.push(fetch(userReposUrl, { headers: { Accept: "application/vnd.github.v3+json" } }));
    }

    const responses = await Promise.all(fetchPromises);
    const searchRes = responses[0];
    
    if (!searchRes.ok) throw new Error("GitHub search API failed");

    const searchData: GitHubSearchResponse = await searchRes.json();
    let allRepos = searchData.items || [];

    if (responses[1] && responses[1].ok) {
      const userRepos: GitHubRepo[] = await responses[1].json();
      if (Array.isArray(userRepos)) {
        // Keep unique repos
        const existingIds = new Set(allRepos.map(r => r.id));
        const newRepos = userRepos.filter(r => !existingIds.has(r.id));
        allRepos = [...newRepos, ...allRepos];
      }
    }

    const mapped = allRepos.map((repo) => ({
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
