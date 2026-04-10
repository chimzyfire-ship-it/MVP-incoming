"use client";

import Image from "next/image";
import { useState, useEffect, FormEvent, useMemo, useCallback } from "react";
import { Search, Loader2, Bookmark, Eye, Server, CheckCircle2, AlertCircle, Wrench, Boxes, Hammer, Trash2, Compass, Activity, UserPlus } from "lucide-react";

import Sidebar, { Tab } from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import NewsTicker from "./components/NewsTicker";
import RepoCard, { Repo } from "./components/RepoCard";
import SettingsPanel from "./components/SettingsPanel";
import RepoDetails from "./components/RepoDetails";
import MarketplaceView from "./components/MarketplaceView";
import FeedView from "./components/FeedView";
import { useAuth } from "./context/AuthContext";
import { INTEREST_CATEGORIES } from "./components/AuthModal";

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

function buildDiscoverSections(repos: Repo[], level: import("@/lib/repoSummary").SkillLevel = "beginner"): DiscoverSection[] {
  type SectionDef = { id: string; title: string; subtitle: string };

  const beginnerDefs: SectionDef[] = [
    { id: "ai",          title: "Smart helpers",             subtitle: "Apps that can think, chat, and answer your questions — like a really clever friend." },
    { id: "devtools",    title: "Handy tools",               subtitle: "Useful helpers that make hard things easy — think of them as power tools for your computer." },
    { id: "frontend",   title: "Websites you can try",       subtitle: "Apps that open right in your browser — just like visiting any normal website." },
    { id: "backend",    title: "Behind-the-scenes workers",  subtitle: "These run quietly in the background, doing the heavy lifting so other apps can work." },
    { id: "infra",      title: "Setup helpers",              subtitle: "Tools that help put apps online and keep them running smoothly." },
    { id: "security",   title: "Safety and privacy",         subtitle: "Things that keep your passwords, accounts, and private stuff safe." },
    { id: "productivity",title: "Everyday helpers",          subtitle: "Useful tools that make your daily life on a computer a little bit easier." },
    { id: "data",       title: "Numbers and charts",          subtitle: "Apps that help you understand information by turning it into pictures and patterns." },
    { id: "creative",   title: "Creative stuff",             subtitle: "Tools for making pictures, videos, sounds, and designs — the fun, artsy side of computers." },
  ];

  const intermediateDefs: SectionDef[] = [
    { id: "ai",          title: "AI-powered apps",           subtitle: "Apps that use AI or language models — chatbots, assistants, and smart tools." },
    { id: "devtools",    title: "Developer tools",           subtitle: "CLIs, SDKs, linters, and build tools — things that speed up your workflow." },
    { id: "frontend",   title: "Web apps & UIs",             subtitle: "Frontend projects built with React, Vue, Next.js, and more — run them in your browser." },
    { id: "backend",    title: "APIs & backend services",   subtitle: "Server-side apps, REST/GraphQL APIs, and microservices." },
    { id: "infra",      title: "DevOps & cloud tools",       subtitle: "Docker, Kubernetes, Terraform, CI/CD — infrastructure and deployment tooling." },
    { id: "security",   title: "Security & auth",            subtitle: "Authentication flows, OAuth, encryption, and privacy tooling." },
    { id: "productivity",title: "Everyday utilities",        subtitle: "Scripts, dashboards, and tools that automate or simplify daily tasks." },
    { id: "data",       title: "Data & analytics",           subtitle: "Data pipelines, dashboards, ML models, and analytics — make sense of numbers." },
    { id: "creative",   title: "Creative & media tools",    subtitle: "Image editors, audio processors, generative art, and design utilities." },
  ];

  const expertDefs: SectionDef[] = [
    { id: "ai",          title: "AI / LLM",                  subtitle: "LLM integrations, agent frameworks, embedding pipelines, RAG systems." },
    { id: "devtools",    title: "Dev tooling",               subtitle: "CLIs, language servers, build systems, testing frameworks, code generators." },
    { id: "frontend",   title: "Frontend / SSR",             subtitle: "React, Vue, Svelte, Next.js, Astro — component libraries and SSR starters." },
    { id: "backend",    title: "Backend / API",              subtitle: "REST, GraphQL, gRPC, WebSocket servers. Node, Go, Python, Rust runtimes." },
    { id: "infra",      title: "Infra / DevOps",             subtitle: "Kubernetes operators, Terraform modules, Helm charts, CI/CD pipelines." },
    { id: "security",   title: "Security / Auth",            subtitle: "OAuth2, OIDC, JWT libs, crypto primitives, pentest tooling, VPN." },
    { id: "productivity",title: "Utilities / scripts",       subtitle: "Automation scripts, TUI tools, shell helpers, productivity hacks." },
    { id: "data",       title: "Data / ML / Analytics",      subtitle: "Pandas, Spark, DuckDB, model training, vector stores, observability." },
    { id: "creative",   title: "Media / creative",           subtitle: "Image/video processing, audio synthesis, generative art, codec tooling." },
  ];

  const sectionDefinitions =
    level === "expert" ? expertDefs
    : level === "intermediate" ? intermediateDefs
    : beginnerDefs;

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
      subtitle: "Other free apps you might find useful or fun.",
      repos: fallbackRepos,
    });
  }

  return sections;
}

export default function Home() {
  const { user, isLoaded, openAuthModal, pendingRunRepo } = useAuth();
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
      setShowOnboarding(!seen && !user);
    } catch {
      setShowOnboarding(false);
    }
  }, [user]);

  // Compulsory onboarding check for existing accounts with missing info
  useEffect(() => {
    if (isLoaded) {
      if (user && (!user.skillLevel || !user.interests || user.interests.length === 0)) {
        openAuthModal("signup_prompt");
      }
    }
  }, [isLoaded, user, openAuthModal]);

  function dismissOnboarding() {
    setShowOnboarding(false);
    try {
      localStorage.setItem("os-layer-onboarding-seen", "1");
    } catch {
      // ignore
    }
  }

  // After sign-up: if there was a pending run repo, execute it automatically
  useEffect(() => {
    if (user && pendingRunRepo) {
      handleRunRepo(pendingRunRepo as Repo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
        const category =
          activeTab === "bookmarks" ? "discover" :
          activeTab === "runnable" ? "runnable" :
          activeTab;
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

  async function handleDeleteRunJob(jobId: string) {
    setIsRunQueueLoading(true);
    try {
      await fetch(`/api/run/${jobId}`, {
        method: "DELETE",
      });
      await fetchRunJobs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunQueueLoading(false);
    }
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
    : activeTab === "runnable" ? "Easy to Run"
    : activeTab === "bookmarks" ? "Saved"
    : "Recently Viewed";

  const heroRepos = !isInSearchMode && activeTab === "discover" ? feedRepos.slice(0, 8) : [];
  const listRepos = activeTab === "discover" && !isInSearchMode ? feedRepos.slice(8) : displayRepos;
  const visibleRepos = showAllRepos ? listRepos : listRepos.slice(0, 32);
  const categorizedGroups = groupReposByCategory(displayRepos);
  const discoverSections = useMemo(() => buildDiscoverSections(feedRepos, user?.skillLevel ?? "beginner"), [feedRepos, user?.skillLevel]);
  const canShowSeeAll = listRepos.length > 32;

  // ── For You: filter discover sections by user's interest categories ──
  const forYouRepos = useMemo(() => {
    if (!user || user.interests.length === 0) return [];
    // Collect section IDs the user cares about
    const wantedSections = new Set<string>();
    user.interests.forEach((interestId) => {
      const cat = INTEREST_CATEGORIES.find((c) => c.id === interestId);
      cat?.sectionIds.forEach((sid) => wantedSections.add(sid));
    });
    // Find matching repos across all discover sections
    const seen = new Set<number>();
    const results: Repo[] = [];
    discoverSections.forEach((section) => {
      if (wantedSections.has(section.id)) {
        section.repos.forEach((repo) => {
          if (!seen.has(repo.id)) {
            seen.add(repo.id);
            results.push(repo);
          }
        });
      }
    });
    return results.slice(0, 12);
  }, [user, discoverSections]);

  // ── FOR UNAUTHENTICATED USERS: Display World-Class Landing Page First ──
  if (isLoaded && !user) {
    return (
      <div className="flex min-h-[100dvh] w-full flex-col bg-[#042a33] text-white overflow-hidden relative">
        {/* Background Gradients & Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(45,212,191,0.15),transparent_100%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_100%,#000_50%,transparent_100%)] opacity-30 transform perspective-[1000px] rotate-x-[60deg] origin-bottom pointer-events-none" />
        
        {/* Wireframe Globe Background Rings */}
        <div className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full pointer-events-none" />
        <div className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full pointer-events-none" />
        <div className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] border border-white/5 rounded-[50%] pointer-events-none -rotate-12" />

        {/* Navbar */}
        <header className="flex w-full items-center justify-between px-6 py-6 md:px-12 relative z-50">
          <div className="flex items-center gap-3">
            {/* Rocket-G Logo Mark */}
            <div className="logo-pulse relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[22%] bg-[#0f1c22] border border-white/10 shadow-[0_0_20px_rgba(45,212,191,0.2)]">
              <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" fill="none">
                <path
                  d="M34 20a14 14 0 1 1-14-14c4.5 0 8.5 2.1 11.1 5.4H26v4h9V6h-4v3.2A18 18 0 1 0 38 20H34z"
                  fill="url(#ggradHero)"
                  opacity="0.9"
                />
                <defs>
                  <linearGradient id="ggradHero" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#94a3b8" />
                  </linearGradient>
                </defs>
              </svg>
              <svg viewBox="0 0 20 20" className="relative z-10 h-[18px] w-[18px]" fill="none">
                <path d="M10 2C7 2 4.5 5 4.5 8.5c0 2.5 1.3 4.7 3.3 5.9L7 17h6l-.8-2.6c2-.3 3.3-2.4 3.3-5.9C15.5 5 13 2 10 2z" fill="#2dd4bf" />
                <ellipse cx="10" cy="9" rx="2" ry="2.5" fill="#0f766e" />
                <path d="M7.5 16.5c0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5H7.5z" fill="#5eead4" opacity="0.7" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">GITMURPH</span>
          </div>
          <button
            onClick={() => openAuthModal("signup_prompt")}
            className="text-[15px] font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            Sign In
          </button>
        </header>

        {/* Hero Section */}
        <main className="flex flex-1 flex-col items-center pt-8 px-4 text-center relative z-10 pb-32">
          
          <div className="inline-flex items-center rounded-full border border-teal-400/30 bg-teal-500/10 px-4 py-1.5 text-sm text-teal-300 font-medium tracking-wide mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(20,184,166,0.15)]">
            <Compass className="h-4 w-4 mr-2 opacity-80" />
            The App Store for Open Source
          </div>
          
          <h1 className="max-w-4xl text-[3rem] font-extrabold tracking-tight text-white md:text-[5.5rem] lg:text-[6.5rem] leading-[1.05] drop-shadow-lg">
            GitHub, translated <br className="hidden sm:block" />
            for <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300">everyone.</span>
          </h1>
          
          <p className="mt-8 max-w-2xl text-[17px] text-[#8ba2a8] md:text-[19px] font-medium leading-relaxed">
            The world&apos;s best tools aren&apos;t on the App Store—they&apos;re hidden on GitHub behind complex code and jargon. We make discovering, understanding, and running open-source apps completely effortless.
          </p>
          
          {/* Central 3D Graphic Layout */}
          <div className="relative mt-16 h-[300px] w-[500px] sm:w-[600px] flex justify-center translate-y-4">
            
            {/* Left Card: Code */}
            <div className="absolute left-[5%] top-[20%] w-[180px] h-[190px] rounded-2xl bg-[#0b1f24]/90 backdrop-blur-xl border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] animate-float-slow p-4 rotate-[-12deg] z-10 text-left">
              <div className="flex gap-1.5 mb-3 border-b border-white/5 pb-3">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80"></div>
              </div>
              <div className="space-y-2 text-[9px] font-mono leading-relaxed opacity-70">
                <p><span className="text-emerald-400">const</span> <span className="text-blue-300">app</span> <span className="text-emerald-400">=</span> <span className="text-yellow-200">require</span>(<span className="text-[#ff7a59]">'gitmurph'</span>);</p>
                <p><span className="text-emerald-400">async function</span> <span className="text-blue-300">deploy</span>() {'{'}</p>
                <p className="pl-3"><span className="text-emerald-400">await</span> app.<span className="text-yellow-200">setup</span>();</p>
                <p className="pl-3">app.<span className="text-yellow-200">run_container</span>();</p>
                <p>{'}'}</p>
                <p className="pt-2 text-zinc-500 italic">{'// Ready in seconds'}</p>
              </div>
            </div>

            {/* Right Card: DB and Browser Layered */}
            <div className="absolute right-[5%] top-[25%] animate-float-medium z-10">
              <div className="relative rotate-[8deg]">
                {/* Back card - Browser */}
                <div className="absolute -top-7 -right-6 w-[88px] h-[88px] rounded-[24%] bg-blue-500/10 backdrop-blur-lg border border-blue-400/30 shadow-[0_0_40px_rgba(59,130,246,0.3)] flex flex-col p-2.5 z-0">
                  <div className="w-full h-full rounded bg-black/40 border border-white/10 flex flex-col pt-1.5">
                    <div className="border-b border-white/10 h-3 w-full px-1.5 flex gap-1">
                      <div className="h-1 w-1 bg-white/40 rounded-full"></div>
                      <div className="h-1 w-1 bg-white/40 rounded-full"></div>
                    </div>
                    <div className="flex-1 p-1.5 flex flex-col gap-1.5 justify-center">
                       <div className="h-1.5 w-3/4 bg-white/20 rounded"></div>
                       <div className="h-1.5 w-1/2 bg-white/20 rounded"></div>
                    </div>
                  </div>
                </div>
                {/* Front card - Database */}
                <div className="relative w-[110px] h-[110px] rounded-[26%] bg-gradient-to-br from-cyan-50 to-white backdrop-blur-xl border border-white shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex items-center justify-center -rotate-6 z-10">
                  <Server className="h-[46px] w-[46px] text-[#052b34] stroke-[1.5]" />
                </div>
              </div>
            </div>

            {/* Center Card: Transforming Squircle + Rocket SVG placed behind */}
            <div className="absolute top-[35%] animate-float-fast z-30 flex flex-col items-center">
              {/* Rocket shooting from behind */}
              <div className="absolute -top-[120px] left-[55%] animate-pulse z-[-1] drop-shadow-[0_0_30px_rgba(45,212,191,0.6)]">
                <svg viewBox="0 0 100 100" className="h-[140px] w-[140px] -rotate-12" fill="none">
                  <path d="M50 15c-15 15-15 35-15 35s10 10 30 10 30-10 30-10-0-20-15-35c-5-5-15-10-15-10s-10 5-15 10z" fill="#2dd4bf" />
                  <path d="M40 50c0 10 10 15 10 15s10-5 10-15-5-15-10-15-10 5-10 15z" fill="#0f766e" />
                  <path d="M35 50l-10 15s5 5 15 0" fill="#ff7a59" />
                  <path d="M65 50l10 15s-5 5-15 0" fill="#ff7a59" />
                  <path d="M50 65l-12 30c5 0 19 0 24 0z" fill="url(#fire)" opacity="0.9" />
                  <defs>
                    <linearGradient id="fire" x1="50" y1="65" x2="50" y2="95" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#fde047" />
                      <stop offset="60%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="w-[140px] h-[140px] rounded-[28%] bg-gradient-to-br from-white to-teal-50 shadow-[0_40px_80px_rgba(0,0,0,0.7),0_0_50px_rgba(45,212,191,0.2)] flex items-center justify-center border border-white relative z-10">
                 <div className="absolute inset-0 rounded-[28%] shadow-[inset_0_4px_12px_rgba(255,255,255,0.9)] pointer-events-none" />
                 <span className="text-[52px] font-bold text-[#052b34] tracking-tighter" style={{ fontFamily: 'monospace' }}>{'</>'}</span>
              </div>
              <div className="mt-4 px-3.5 py-1.5 rounded-full border border-teal-400/40 bg-teal-900/60 backdrop-blur-md shadow-[0_0_20px_rgba(20,184,166,0.3)] z-10">
                <span className="text-[11px] font-bold text-teal-300 tracking-widest uppercase">Transforming...</span>
              </div>
            </div>
          </div>
          
          <div className="mt-28 flex flex-col sm:flex-row items-center justify-center gap-6 relative z-50">
            <button
              onClick={() => openAuthModal("signup_prompt")}
              className="group relative inline-flex h-[64px] items-center justify-center overflow-hidden rounded-full px-14 font-bold text-white shadow-[0_0_50px_rgba(59,130,246,0.6),0_0_100px_rgba(45,212,191,0.3)] transition-all duration-300 hover:scale-[1.04] active:scale-[0.98] w-full sm:w-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-cyan-300 to-blue-500 opacity-30 blur-xl group-hover:opacity-50 transition-opacity" />
              <div className="absolute top-0 inset-x-6 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-60" />
              <span className="relative z-10 flex items-center gap-2.5 text-[18px] tracking-wide drop-shadow-md">
                <UserPlus className="h-[22px] w-[22px] opacity-90" />
                Sign In / Sign Up
              </span>
            </button>
            <p className="text-[16px] font-medium text-[#8ba2a8] sm:ml-2">100% Free. Takes 30 seconds.</p>
          </div>
        </main>
      </div>
    );
  }

  // ── FOR AUTHENTICATED USERS: Display the normal App Interface ──
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


            {/* ── Original onboarding banner (guests only) ── */}
            {showOnboarding && !user && activeTab !== "runtime" && false && (
              <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-9 w-9 rounded-xl bg-black/25 border border-white/10 flex items-center justify-center">
                    <Server className="h-4 w-4 text-blue-300" />
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

            {/* ── For You Section (Moved to the top!) ── */}
            {activeTab === "discover" && !isInSearchMode && user && forYouRepos.length > 0 && (
              <section className="flex flex-col gap-6 mb-8 mt-2">
                <div className="flex items-end justify-between gap-4 pl-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Compass className="h-4 w-4 text-emerald-400" />
                      <h2 className="text-xl font-bold tracking-tight text-white">
                        For you, {user.name.split(" ")[0]}
                      </h2>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Handpicked based on your interests — {user.interests.length} categor{user.interests.length === 1 ? "y" : "ies"} selected
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-x-8 gap-y-2 lg:grid-cols-2">
                  {forYouRepos.map((repo) => (
                    <div key={repo.id} onClick={() => handleRepoView(repo)} className="cursor-pointer">
                      <RepoCard repo={repo} onRun={handleRunRepo} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!isInSearchMode && activeTab === "discover" && heroRepos.length > 0 && (
              <NewsTicker repos={heroRepos} />
            )}

            {activeTab === "runtime" && (
              <section className="flex flex-col gap-6">
                <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-5">
                  <div className="flex items-start gap-3">
                    <Server className="mt-0.5 h-5 w-5 text-blue-300" />
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
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDeleteRunJob(job.id)}
                                  className="shrink-0 rounded-full border border-zinc-400/20 bg-zinc-500/10 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-500/20 transition-colors"
                                  title="Stop and Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                {job.appUrl ? (
                                  <button
                                    onClick={() => window.open(job.appUrl as string, "_blank")}
                                    className="shrink-0 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-colors"
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
                                    className="shrink-0 rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25 transition-colors"
                                  >
                                    Try again
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-zinc-500">Waiting for the app to be ready…</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "runnable" && !isLoading && (
              <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-5">
                <div className="flex items-start gap-3">
                  <Activity className="mt-0.5 h-5 w-5 text-emerald-300" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Apps that actually run</h2>
                    <p className="mt-1 text-sm text-zinc-300">
                      These are handpicked repos that start up with a single command — no API keys, no database setup, no headaches. 
                      Just tap <span className="font-semibold text-emerald-300">Run</span> and we handle the rest.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs rounded-full border border-white/10 bg-black/20 px-3 py-1 text-zinc-300">
                        ✓ No API keys needed
                      </span>
                      <span className="text-xs rounded-full border border-white/10 bg-black/20 px-3 py-1 text-zinc-300">
                        ✓ No database setup
                      </span>
                      <span className="text-xs rounded-full border border-white/10 bg-black/20 px-3 py-1 text-zinc-300">
                        ✓ Opens in your browser
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
