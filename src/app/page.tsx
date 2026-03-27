"use client";

import Image from "next/image";
import { useState, useEffect, FormEvent, useMemo, useCallback } from "react";
import { Search, Loader2, Bookmark, Eye, Rocket, CheckCircle2, AlertCircle, Wrench, Boxes, Hammer } from "lucide-react";

import Sidebar, { Tab } from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import NewsTicker from "./components/NewsTicker";
import RepoCard, { Repo } from "./components/RepoCard";
import SettingsPanel from "./components/SettingsPanel";
import RepoDetails from "./components/RepoDetails";
import MarketplaceView from "./components/MarketplaceView";
import FeedView from "./components/FeedView";

function getLocalRepos(key: string): Repo[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalRepo(key: string, repo: Repo, limit: number = 50) {
  const current = getLocalRepos(key);
  const filtered = current.filter((r) => r.id !== repo.id);
  const updated = [repo, ...filtered].slice(0, limit);
  localStorage.setItem(key, JSON.stringify(updated));
}

// Helper to group repos by primary language for the Categories view
function groupReposByCategory(repos: Repo[]) {
  const groups: Record<string, Repo[]> = {};
  repos.forEach((repo) => {
    const lang = repo.language && repo.language !== "Unknown" ? repo.language : "Other Utilities";
    if (!groups[lang]) groups[lang] = [];
    groups[lang].push(repo);
  });
  return groups;
}

interface DiscoverSection {
  id: string;
  title: string;
  subtitle: string;
  repos: Repo[];
}

type RunStage = "queued" | "detecting" | "installing" | "building" | "running" | "failed";

interface RuntimeRunJob {
  id: string;
  repo: Repo;
  stage: RunStage;
  createdAt: number;
  updatedAt: number;
  runtime: {
    runtime: string;
    framework: string;
    packageManager: string;
    installCommand: string;
    buildCommand: string;
    startCommand: string;
  };
  sandbox: {
    engine: string;
    cpu: string;
    memoryMb: number;
  };
  security: {
    network: string;
    filesystem: string;
  };
  cacheKey: string;
  appUrl: string | null;
  health: {
    status: "starting" | "healthy" | "degraded";
    restartCount: number;
    lastCheckAt: number;
  };
  logs: string[];
}

function buildDiscoverSections(repos: Repo[]): DiscoverSection[] {
  const sectionDefinitions: Omit<DiscoverSection, "repos">[] = [
    { id: "ai", title: "AI helpers", subtitle: "Chat with AI-made apps and automate small tasks." },
    { id: "devtools", title: "Developer tools", subtitle: "Helpful command tools and automation for building." },
    { id: "frontend", title: "Web builders", subtitle: "Apps you can use in your browser." },
    { id: "backend", title: "Server apps", subtitle: "Apps that run in the background and power features." },
    { id: "infra", title: "Cloud setup", subtitle: "Help for deploying and running apps." },
    { id: "security", title: "Safety & privacy", subtitle: "Security features for safer apps and better protection." },
    { id: "productivity", title: "Productivity tools", subtitle: "Useful daily tools and easier workflows." },
    { id: "data", title: "Data & smart insights", subtitle: "Apps for data, charts, and smart predictions." },
    { id: "creative", title: "Creative tools", subtitle: "Apps for images, video, design, and content." },
  ];

  const buckets = new Map<string, Repo[]>();
  sectionDefinitions.forEach((section) => buckets.set(section.id, []));

  const includesAny = (source: string, needles: string[]) => needles.some((needle) => source.includes(needle));

  for (const repo of repos) {
    const source = `${repo.title} ${repo.plainEnglishDescription} ${repo.language || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
    let sectionId = "productivity";

    if (includesAny(source, ["ai", "llm", "agent", "gpt", "neural", "transformer", "langchain"])) sectionId = "ai";
    else if (includesAny(source, ["cli", "sdk", "plugin", "developer", "devtool", "build", "testing"])) sectionId = "devtools";
    else if (includesAny(source, ["react", "next", "vue", "angular", "frontend", "ui", "css", "tailwind"])) sectionId = "frontend";
    else if (includesAny(source, ["api", "server", "backend", "database", "postgres", "graphql", "microservice"])) sectionId = "backend";
    else if (includesAny(source, ["docker", "kubernetes", "terraform", "cloud", "devops", "infra", "aws"])) sectionId = "infra";
    else if (includesAny(source, ["security", "auth", "oauth", "encryption", "privacy", "jwt"])) sectionId = "security";
    else if (includesAny(source, ["data", "analytics", "pandas", "spark", "ml", "model", "dataset"])) sectionId = "data";
    else if (includesAny(source, ["image", "video", "audio", "design", "creative", "editor", "media"])) sectionId = "creative";

    buckets.get(sectionId)?.push(repo);
  }

  const sections = sectionDefinitions
    .map((definition) => ({ ...definition, repos: buckets.get(definition.id) || [] }))
    .filter((section) => section.repos.length > 0)
    .sort((a, b) => b.repos.length - a.repos.length);

  const fallbackRepos = repos.filter((repo) => !sections.some((section) => section.repos.some((r) => r.id === repo.id)));
  if (fallbackRepos.length > 0) {
    sections.push({
      id: "discover",
      title: "More to explore",
      subtitle: "New open-source apps you can try.",
      repos: fallbackRepos,
    });
  }

  return sections;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Repo[]>([]);
  const [feedRepos, setFeedRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [selectedFromTab, setSelectedFromTab] = useState<Tab>("discover");
  const [showAllRepos, setShowAllRepos] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [runJobs, setRunJobs] = useState<RuntimeRunJob[]>([]);
  const [isRunQueueLoading, setIsRunQueueLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = localStorage.getItem("os-layer-onboarding-seen");
      setShowOnboarding(!seen);
    } catch {
      setShowOnboarding(false);
    }
  }, []);

  function dismissOnboarding() {
    setShowOnboarding(false);
    try {
      localStorage.setItem("os-layer-onboarding-seen", "1");
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    setSelectedRepo(null); 
    setSearchQuery(""); 
    setSearchResults([]);
    setShowAllRepos(false);
    setExpandedSections({});

    if (activeTab === "settings" || activeTab === "runtime" || activeTab === "feed") {
      if (activeTab === "feed") {
        // Feed uses the same trending data
        async function fetchFeedData() {
          setIsLoading(true);
          try {
            const res = await fetch(`/api/trending?category=discover`);
            if (!res.ok) throw new Error("Feed fetch failed");
            const data: Repo[] = await res.json();
            setFeedRepos(data);
          } catch (err) {
            console.error(err);
            setFeedRepos([]);
          } finally {
            setIsLoading(false);
          }
        }
        fetchFeedData();
      }
      return;
    }
    if (activeTab === "viewed") {
      setFeedRepos(getLocalRepos("os-layer-viewed"));
      return;
    }
    if (activeTab === "bookmarks") {
      setFeedRepos(getLocalRepos("os-layer-bookmarks"));
      return;
    }

    async function fetchFeed() {
      setIsLoading(true);
      try {
        const category = activeTab === "bookmarks" ? "discover" : activeTab;
        const res = await fetch(`/api/trending?category=${category}`);
        if (!res.ok) throw new Error("Feed fetch failed");
        const data: Repo[] = await res.json();
        setFeedRepos(data);
      } catch (err) {
        console.error(err);
        setFeedRepos([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeed();
  }, [activeTab]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (activeTab === "settings" || activeTab === "categories" || activeTab === "runtime" || activeTab === "feed") {
      setActiveTab("discover");
    }
    setSelectedRepo(null);

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (!res.ok) throw new Error("Search failed");
      const data: Repo[] = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchRunJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/run", { cache: "no-store" });
      if (!res.ok) throw new Error("Run jobs fetch failed");
      const data: RuntimeRunJob[] = await res.json();
      setRunJobs(data);
    } catch {
      setRunJobs([]);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "runtime") return;
    setIsRunQueueLoading(true);
    fetchRunJobs().finally(() => setIsRunQueueLoading(false));
    const interval = window.setInterval(() => {
      fetchRunJobs();
    }, 2000);
    return () => window.clearInterval(interval);
  }, [activeTab, fetchRunJobs]);

  function handleRepoView(repo: Repo) {
    saveLocalRepo("os-layer-viewed", repo, 20);
    setSelectedFromTab(activeTab);
    setSelectedRepo(repo);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleRunRepo(repo: Repo) {
    saveLocalRepo("os-layer-viewed", repo, 20);
    setSelectedRepo(null);
    setSelectedFromTab(activeTab);
    setActiveTab("runtime");
    setIsRunQueueLoading(true);
    try {
      await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repo }),
      });
      await fetchRunJobs();
    } finally {
      setIsRunQueueLoading(false);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const isInSearchMode = searchQuery.trim().length > 0 && searchResults.length > 0;
  const displayRepos = isInSearchMode ? searchResults : feedRepos;
  const showFeed = activeTab !== "settings";

  const pageTitle = isInSearchMode 
    ? "Search Results" 
    : activeTab === "discover" ? "Explore"
    : activeTab === "categories" ? "Types"
    : activeTab === "shop" ? "Marketplace"
    : activeTab === "feed" ? "Feed"
    : activeTab === "runtime" ? "Try Apps"
    : activeTab === "trending" ? "Popular now"
    : activeTab === "bookmarks" ? "Saved"
    : "Recently Viewed";

  const heroRepos = !isInSearchMode && activeTab === "discover" ? feedRepos.slice(0, 8) : [];
  const listRepos = activeTab === "discover" && !isInSearchMode ? feedRepos.slice(8) : displayRepos;
  const visibleRepos = showAllRepos ? listRepos : listRepos.slice(0, 32);
  const categorizedGroups = groupReposByCategory(displayRepos);
  const discoverSections = useMemo(() => buildDiscoverSections(feedRepos), [feedRepos]);
  const canShowSeeAll = listRepos.length > 32;

  return (
    <>
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearch}
      />

      <main className="flex h-[100dvh] bg-[#042a33] w-full flex-1 flex-col overflow-y-auto px-4 py-8 pb-32 sm:px-10 sm:py-10">
        {selectedRepo ? (
          <RepoDetails key={selectedRepo.id} repo={selectedRepo} showShopActions={selectedFromTab === "shop"} onRun={handleRunRepo} onClose={() => setSelectedRepo(null)} />
        ) : showFeed ? (
          <div className="mx-auto w-full max-w-[1000px] flex flex-col gap-10">
            
            <form onSubmit={handleSearch} className="w-full lg:hidden block">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full rounded-md border border-white/10 bg-black/20 py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-500 focus:border-blue-500/50 focus:bg-black/40 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-inner"
                />
              </div>
            </form>

            <header className="flex flex-col gap-1 border-b border-white/10 pb-4">
              <h1 className="text-[28px] font-bold tracking-tight text-white sm:text-[34px]">
                {pageTitle}
              </h1>
            </header>

            {showOnboarding && activeTab !== "runtime" && (
              <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-9 w-9 rounded-xl bg-black/25 border border-white/10 flex items-center justify-center">
                    <Rocket className="h-4 w-4 text-blue-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">
                      How to use GITMURPH
                    </p>
                    <p className="mt-1 text-sm text-zinc-200">
                      Tap <span className="font-semibold text-zinc-100">Run</span> on any app you like. We set it up and open it in your browser when it&apos;s ready.
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Most apps work right away. Some may take longer (or fail) if they need special setup.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={dismissOnboarding}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
                      >
                        Got it
                      </button>
                      <button
                        onClick={() => setActiveTab("runtime")}
                        className="rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-400/15 transition-colors"
                      >
                        See runs
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ Marketplace View ═══ */}
            {activeTab === "shop" && !isInSearchMode && (
              <MarketplaceView
                repos={displayRepos}
                isLoading={isLoading}
                onRepoView={handleRepoView}
                onRun={handleRunRepo}
              />
            )}

            {/* ═══ Feed View ═══ */}
            {activeTab === "feed" && (
              <FeedView
                repos={feedRepos}
                isLoading={isLoading}
                onRepoView={handleRepoView}
                onRun={handleRunRepo}
              />
            )}

            {!isInSearchMode && activeTab === "discover" && heroRepos.length > 0 && (
              <NewsTicker repos={heroRepos} />
            )}

            {activeTab === "runtime" && (
              <section className="flex flex-col gap-6">
                <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-5">
                  <div className="flex items-start gap-3">
                    <Rocket className="mt-0.5 h-5 w-5 text-blue-300" />
                    <div>
                      <h2 className="text-xl font-bold text-white">Press Run, we set it up for you</h2>
                      <p className="mt-1 text-sm text-zinc-300">
                        We check what this app needs, install it, start it in the background, and then open it in your browser when it&apos;s ready.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-xs rounded-full border border-white/10 bg-black/20 px-3 py-1 text-zinc-300">
                          1) Check the app
                        </span>
                        <span className="text-xs rounded-full border border-white/10 bg-black/20 px-3 py-1 text-zinc-300">
                          2) Set it up
                        </span>
                        <span className="text-xs rounded-full border border-white/10 bg-black/20 px-3 py-1 text-zinc-300">
                          3) Open it
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20">
                  <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <h3 className="text-lg font-semibold text-white">In progress</h3>
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{runJobs.length} apps</span>
                  </div>
                  <div className="flex flex-col divide-y divide-white/10">
                    {isRunQueueLoading ? (
                      <div className="px-5 py-10 text-sm text-zinc-400">Checking runs...</div>
                    ) : runJobs.length === 0 ? (
                      <div className="px-5 py-10 text-sm text-zinc-400">
                        Nothing is running yet. Tap <span className="text-zinc-200 font-semibold">Run</span> on a repo to start.
                      </div>
                    ) : (
                      runJobs.map((job) => {
                        const icon =
                          job.stage === "running" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
                          job.stage === "failed" ? <AlertCircle className="h-4 w-4 text-rose-400" /> :
                          job.stage === "building" ? <Hammer className="h-4 w-4 text-amber-300" /> :
                          job.stage === "installing" ? <Boxes className="h-4 w-4 text-blue-300" /> :
                          <Wrench className="h-4 w-4 text-zinc-300" />;

                        const stageLabel =
                          job.stage === "queued" ? "Ready to start" :
                          job.stage === "detecting" ? "Checking the project" :
                          job.stage === "installing" ? "Getting needed files" :
                          job.stage === "building" ? "Preparing the app" :
                          job.stage === "running" ? "Running now" :
                          "Could not run";

                        return (
                          <div key={job.id} className="flex flex-col gap-3 px-5 py-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-black/30">
                                  {job.repo.avatar ? (
                                    <Image
                                      src={job.repo.avatar}
                                      alt={job.repo.owner || job.repo.title}
                                      width={40}
                                      height={40}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : null}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-white">{job.repo.title}</p>
                                  <p className="truncate text-xs text-zinc-400">{job.repo.owner}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-zinc-200">
                                {icon}
                                {stageLabel}
                              </div>
                            </div>
                            <div className="grid gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-zinc-300 sm:grid-cols-2">
                              <div>We found: {job.runtime.framework}</div>
                              <div>Setup step: {stageLabel}</div>
                            </div>
                            <details className="group">
                              <summary className="cursor-pointer px-1 py-1 text-[11px] text-zinc-400 hover:text-zinc-300">
                                Show technical messages
                              </summary>
                              <div className="grid gap-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-zinc-400">
                                {(job.logs || []).slice(-3).map((line, idx) => (
                                  <p key={`${job.id}-${idx}`} className="truncate">{line}</p>
                                ))}
                              </div>
                            </details>
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-[11px] text-zinc-500">We&apos;re setting this up in the background.</p>
                              {job.appUrl ? (
                                <button
                                  onClick={() => window.open(job.appUrl as string, "_blank")}
                                  className="shrink-0 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300"
                                >
                                  Open app
                                </button>
                              ) : job.stage === "failed" ? (
                                <button
                                  onClick={async () => {
                                    setIsRunQueueLoading(true);
                                    try {
                                      await fetch("/api/run", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ repo: job.repo }),
                                      });
                                      await fetchRunJobs();
                                    } finally {
                                      setIsRunQueueLoading(false);
                                    }
                                  }}
                                  className="shrink-0 rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200"
                                >
                                  Try again
                                </button>
                              ) : (
                                <span className="text-[11px] text-zinc-500">Waiting for the app to be ready…</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            )}

            {(isLoading || isSearching) && (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                <span className="text-sm text-zinc-400 font-medium tracking-wide">
                  {isSearching ? "Searching..." : "Loading..."}
                </span>
              </div>
            )}

            {!isLoading && !isSearching && displayRepos.length > 0 && activeTab !== "runtime" && activeTab !== "shop" && activeTab !== "feed" && (
              <div className="flex flex-col gap-12">
                
                {activeTab === "discover" && !isInSearchMode && (
                  <div className="flex flex-col gap-10">
                    {discoverSections.map((section) => {
                      const isExpanded = !!expandedSections[section.id];
                      const visibleSectionRepos = isExpanded ? section.repos : section.repos.slice(0, 8);
                      const hasMore = section.repos.length > 8;

                      return (
                        <section key={section.id} className="flex flex-col gap-4">
                          <div className="flex items-end justify-between gap-4 pl-1">
                            <div className="flex flex-col gap-1">
                              <h2 className="text-xl font-bold tracking-tight text-white">{section.title}</h2>
                              <p className="text-sm text-zinc-400">{section.subtitle}</p>
                            </div>
                            {hasMore ? (
                              <button
                                onClick={() =>
                                  setExpandedSections((prev) => ({
                                    ...prev,
                                    [section.id]: !prev[section.id],
                                  }))
                                }
                                className="text-[13px] font-semibold tracking-wide text-blue-400 hover:text-blue-300"
                              >
                                {isExpanded ? "Show less" : `Show all (${section.repos.length})`}
                              </button>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-1 gap-x-8 gap-y-2 lg:grid-cols-2">
                            {visibleSectionRepos.map((repo) => (
                              <div key={repo.id} onClick={() => handleRepoView(repo)} className="cursor-pointer">
                                <RepoCard repo={repo} onRun={handleRunRepo} />
                              </div>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}

                {activeTab !== "categories" && !(activeTab === "discover" && !isInSearchMode) && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between pl-1">
                      <h2 className="text-xl font-bold tracking-tight text-white">
                        {isInSearchMode ? "Matches" : "Popular picks"}
                      </h2>
                      {canShowSeeAll ? (
                        <button
                          onClick={() => setShowAllRepos((prev) => !prev)}
                          className="text-[13px] font-semibold tracking-wide text-blue-400 hover:text-blue-300"
                        >
                          {showAllRepos ? "Show less" : `Show all (${listRepos.length})`}
                        </button>
                      ) : null}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-x-8 gap-y-2 lg:grid-cols-2">
                      {visibleRepos.map((repo) => (
                        <div key={repo.id} onClick={() => handleRepoView(repo)} className="cursor-pointer">
                          <RepoCard repo={repo} onRun={handleRunRepo} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "categories" && !isInSearchMode && (
                  <>
                    {Object.entries(categorizedGroups).map(([categoryName, reposInCat]) => (
                      <div key={categoryName} className="flex flex-col gap-4">
                        <div className="flex items-center pl-1">
                          <h2 className="text-xl font-bold tracking-tight text-white capitalize">
                            {categoryName}
                          </h2>
                        </div>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-2 lg:grid-cols-2">
                          {reposInCat.map((repo) => (
                            <div key={repo.id} onClick={() => handleRepoView(repo)} className="cursor-pointer">
                              <RepoCard repo={repo} onRun={handleRunRepo} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}

              </div>
            )}

            {!isLoading && !isSearching && displayRepos.length === 0 && activeTab !== "runtime" && activeTab !== "shop" && activeTab !== "feed" && (
              <div className="flex flex-col items-center justify-center gap-3 py-32 text-center bg-black/20 rounded-2xl border border-white/5 shadow-inner">
                {activeTab === "viewed" ? (
                  <>
                    <Eye className="h-10 w-10 text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-400">
                      Repositories you view will appear here.
                    </p>
                  </>
                ) : activeTab === "bookmarks" ? (
                  <>
                    <Bookmark className="h-10 w-10 text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-400">
                      You haven&apos;t saved any repositories yet.
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-zinc-400">
                    No results found. Try a different search.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl py-4">
            <SettingsPanel />
          </div>
        )}
      </main>

      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}
