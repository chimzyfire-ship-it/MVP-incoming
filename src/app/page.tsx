"use client";

import Image from "next/image";
import { useState, useEffect, FormEvent, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, Bookmark, Eye, Server, CheckCircle2, AlertCircle, Wrench, Boxes, Hammer, Trash2, Compass, Activity, UserPlus, Code2, Database, AppWindow } from "lucide-react";
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

  // ── FOR UNAUTHENTICATED USERS: Display Pixel-Perfect Landing Page ──
  if (isLoaded && !user) {
    return (
      // h-full + overflow-y-auto: scrolls within the layout's h-[100dvh] wrapper
      <div className="relative h-full w-full overflow-y-auto bg-[#060D13] font-sans selection:bg-cyan-500/30">

        {/* ── BACKGROUND LAYER: fixed so it stays in place as the user scrolls ── */}
        <div className="pointer-events-none fixed inset-0 z-0">
          {/* Deep dark teal radial */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 90% 70% at 50% 35%, #0c2e36 0%, #060D13 65%)",
            }}
          />
          {/* Neon grid floor plate – anchored bottom */}
          <Image
            src="/assets/Full Background plate.png"
            alt=""
            fill
            className="object-cover object-bottom"
            style={{ opacity: 0.85 }}
            priority
          />
          {/* Ambient teal glow blob behind nav */}
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2 h-[320px] w-[800px] rounded-full blur-[110px]"
            style={{ background: "radial-gradient(ellipse, rgba(0,229,255,0.22) 0%, transparent 70%)" }}
          />
        </div>

        {/* ── FOREGROUND CONTENT (scrolls over the fixed bg) ── */}
        <div className="relative z-10 flex flex-col min-h-screen pb-20">

          {/* ── NAVIGATION ── */}
          <nav className="mx-auto w-full max-w-6xl px-6 pt-6 pb-4 sticky top-0 z-20">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-xl shadow-[0_0_30px_rgba(0,229,255,0.07)]">
              {/* Brand */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#101820] p-1 shadow-[0_0_14px_rgba(0,229,255,0.3)]">
                  <Image
                    src="/assets/The official gitmurph logo .png"
                    alt="Gitmurph Logo"
                    width={28}
                    height={28}
                    className="object-contain"
                    style={{ width: 28, height: "auto" }}
                    priority
                  />
                </div>
                <span className="text-[17px] font-bold tracking-tight text-white">Gitmurph</span>
              </div>

              {/* Center links */}
              <div className="hidden sm:flex items-center gap-8">
                <a 
                  href="#features" 
                  onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="text-[15px] font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Features
                </a>
                <a 
                  href="#pricing" 
                  onClick={(e) => { e.preventDefault(); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="text-[15px] font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Pricing
                </a>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => openAuthModal("signin_prompt")}
                  className="hidden sm:block text-[15px] font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  id="get-started-btn"
                  onClick={() => openAuthModal("signup_prompt")}
                  className="flex h-10 items-center rounded-full bg-cyan-400 px-5 text-[14px] font-bold text-black shadow-[0_0_18px_rgba(0,229,255,0.55)] transition-all hover:bg-cyan-300 hover:shadow-[0_0_28px_rgba(0,229,255,0.75)] active:scale-[0.97]"
                >
                  Get Started
                </button>
              </div>
            </div>
          </nav>

          {/* ── HERO TEXT ── */}
          <main className="mt-8 flex flex-col items-center text-center px-6">
            {/* Headline */}
            <h1 className="max-w-5xl text-[clamp(2.8rem,6.5vw,5.5rem)] font-extrabold leading-[1.05] tracking-tight">
              <span className="text-white">GitHub, translated </span>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #00e5ff 0%, #7dd3fc 100%)" }}
              >
                everyone.
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="mt-5 max-w-2xl text-[clamp(0.9rem,1.6vw,1.1rem)] leading-relaxed text-gray-400">
              The world&apos;s best tools aren&apos;t on the App Store—they&apos;re hidden on GitHub behind complex code and
              jargon. We make discovering, understanding, and running open-source apps completely effortless.
            </p>

            {/* ── 3D VISUAL CENTERPIECE ── */}
            <div className="relative mt-24 mb-16 h-[380px] w-full max-w-[900px] flex justify-center perspective-[1200px]">
              
              {/* 1. Source Code Panel (Left) */}
              <motion.div 
                animate={{ y: [-12, 12, -12], rotateY: [15, 17, 15], rotateZ: [-4, -3, -4] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                className="hidden md:flex absolute left-[5%] top-10 flex-col rounded-[24px] border border-white/20 bg-[#162029]/80 p-6 shadow-[0_30px_60px_rgba(34,211,238,0.15),inset_0_1px_4px_rgba(255,255,255,0.2)] backdrop-blur-2xl z-20 text-left w-[360px] lg:w-[400px] transform-gpu will-change-transform"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Mac window dots */}
                <div className="flex gap-2.5 mb-5">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]" />
                  <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]" />
                  <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f] shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]" />
                </div>
                {/* Code text */}
                <pre className="text-[14px] leading-[1.7] font-mono text-zinc-300 overflow-hidden">
                  <span className="text-[#ff7b72] font-semibold">import</span> <span className="text-[#c9d1d9]">app_manager</span>{"\n"}
                  <span className="text-[#ff7b72] font-semibold">import</span> <span className="text-[#c9d1d9]">app_manager</span> <span className="text-[#ff7b72] font-semibold">as</span> <span className="text-[#c9d1d9]">app</span>{"\n\n"}
                  <span className="text-[#ff7b72] font-semibold">def</span> <span className="text-[#d2a8ff] font-semibold">translate_repo</span><span className="text-[#c9d1d9]">():</span>{"\n"}
                  {"    "}<span className="text-[#c9d1d9]">repo =</span> <span className="text-[#a5d6ff]">'translate_repo()'</span>{"\n\n"}
                  <span className="text-[#8b949e]">{"    "}# Run open-source effortlessly</span>{"\n"}
                  {"    "}<span className="text-[#c9d1d9]">app_manager.</span><span className="text-[#d2a8ff] font-semibold">deploy</span><span className="text-[#c9d1d9]">()</span>{"\n\n"}
                  {"    "}<span className="text-[#ff7b72] font-semibold">return</span> <span className="text-[#c9d1d9]">app</span>
                </pre>
                
                {/* Internal Glow Reflection */}
                <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-gradient-to-tr from-cyan-500/5 to-amber-500/5 mix-blend-overlay" />
              </motion.div>

              {/* 2. Central Engine / Rocket */}
              <motion.div 
                animate={{ y: [-8, 8, -8] }}
                transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.5 }}
                className="absolute left-1/2 top-4 z-40 -translate-x-1/2 flex items-center justify-center transform-gpu scale-125"
              >
                <div className="relative">
                  {/* Exhaust Flame / Thruster Glow */}
                  <div className="absolute -bottom-24 -right-24 w-40 h-40 rounded-[100%] bg-gradient-to-tr from-[#ff6b00] via-[#ffaa00] to-cyan-300 opacity-60 blur-3xl transform rotate-45 animate-pulse" style={{ animationDuration: '3s' }} />
                  
                  {/* Rocket Body using SVG to mimic 3D cyan object */}
                  <div className="relative flex items-center justify-center rounded-full drop-shadow-[0_0_60px_rgba(34,211,238,0.7)] text-cyan-300 transform -rotate-12 translate-x-4 translate-y-4">
                     <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="1" className="lucide lucide-rocket">
                       <defs>
                         <linearGradient id="rocketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                           <stop offset="0%" stopColor="#cffafe" />
                           <stop offset="50%" stopColor="#06b6d4" />
                           <stop offset="100%" stopColor="#0881a3" />
                         </linearGradient>
                       </defs>
                       <path fill="url(#rocketGrad)" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                       <path fill="url(#rocketGrad)" d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                       <path fill="url(#rocketGrad)" d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                       <path fill="url(#rocketGrad)" d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                     </svg>
                  </div>
                </div>
              </motion.div>

              {/* 3. Floating Glass Cards (Right Side) */}
              
              {/* Code Card (< />) */}
              <motion.div 
                animate={{ y: [-10, 10, -10] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                className="hidden md:flex absolute right-[20%] top-6 z-30 flex-col items-center gap-4 will-change-transform"
              >
                <div className="flex h-[110px] w-[110px] items-center justify-center rounded-[28px] border-[1.5px] border-white/30 bg-gradient-to-br from-white/10 to-transparent shadow-[0_20px_40px_rgba(0,0,0,0.5),inset_0_1px_10px_rgba(255,255,255,0.2)] backdrop-blur-xl transform-gpu rotate-3 hover:rotate-0 hover:scale-110 transition-all duration-300 group">
                  <div className="absolute inset-0 rounded-[28px] bg-[#06b6d4]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Code2 className="h-14 w-14 text-orange-400 drop-shadow-[0_0_15px_rgba(255,165,0,0.8)]" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-bold tracking-[0.25em] text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]">TRANSFORMING...</span>
              </motion.div>

              {/* Database Card */}
              <motion.div 
                animate={{ y: [-15, 15, -15] }}
                transition={{ repeat: Infinity, duration: 6.5, ease: "easeInOut", delay: 0.3 }}
                className="absolute right-[-2%] md:right-[2%] top-[-10px] z-10"
              >
                <div className="flex h-[90px] w-[90px] items-center justify-center rounded-[24px] border-[1.5px] border-cyan-400/50 bg-[#042a33]/60 shadow-[0_15px_35px_rgba(0,0,0,0.6),0_0_30px_rgba(34,211,238,0.3)] backdrop-blur-xl transform-gpu -rotate-6 hover:rotate-0 hover:scale-110 transition-all duration-300">
                  <Database className="h-12 w-12 text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" strokeWidth={1.5} />
                </div>
              </motion.div>

              {/* Window/Layout Card */}
              <motion.div 
                animate={{ y: [-12, 12, -12] }}
                transition={{ repeat: Infinity, duration: 5.8, ease: "easeInOut", delay: 0.8 }}
                className="absolute right-[2%] md:right-[10%] bottom-6 z-20"
              >
                <div className="flex h-[120px] w-[120px] items-center justify-center rounded-[30px] border-[1.5px] border-white/20 bg-white/5 shadow-[0_25px_50px_rgba(0,0,0,0.5),inset_0_1px_5px_rgba(255,255,255,0.1)] backdrop-blur-xl transform-gpu rotate-6 hover:rotate-0 hover:scale-110 transition-all duration-300">
                  <AppWindow className="h-16 w-16 text-zinc-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" strokeWidth={1.5} />
                </div>
              </motion.div>

            </div>
          </main>

          {/* ── FEATURES SECTION (Bento Grid) ── */}
          <section id="features" className="mt-32 px-6 pb-24 w-full flex justify-center">
            <div className="max-w-5xl w-full flex flex-col items-center">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 text-center drop-shadow-sm">
                Magic, Without the Manual.
              </h2>
              <p className="text-[17px] text-zinc-400 max-w-2xl text-center mb-16 font-medium">
                We wrapped the hardest parts of computer science into aesthetic little bubbles. Just tap and let it work.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
                
                {/* Feature 1: Search & Translate (Span 8 columns) */}
                <motion.div 
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="md:col-span-8 will-change-transform group relative flex flex-col justify-end h-[360px] overflow-hidden rounded-[32px] border border-white/10 bg-[#0a151a] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.5),inset_0_1px_5px_rgba(255,255,255,0.05)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  {/* Custom UI Art: Search Command Window */}
                  <div className="absolute top-8 right-8 left-8 h-[200px] rounded-2xl border border-white/15 bg-black/60 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3 bg-white/5">
                      <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500"/><div className="w-3 h-3 rounded-full bg-amber-500"/><div className="w-3 h-3 rounded-full bg-emerald-500"/></div>
                      <div className="flex-1 flex items-center h-7 rounded-md bg-black/50 px-3 border border-white/5 shadow-inner">
                        <span className="text-xs text-cyan-400 font-mono flex items-center gap-2"><span className="text-zinc-500">{'>'}</span> find neural-net upscale</span>
                      </div>
                    </div>
                    <div className="flex-1 p-5 relative overflow-hidden">
                       <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyan-500/20 blur-3xl rounded-full" />
                       <div className="w-3/4 h-3 rounded bg-zinc-800 mb-3" />
                       <div className="w-1/2 h-3 rounded bg-zinc-800 mb-3" />
                       <div className="w-full h-3 rounded bg-cyan-900/40 mb-3 border border-cyan-500/20" />
                       <div className="w-2/3 h-3 rounded bg-zinc-800" />
                    </div>
                  </div>

                  <div className="relative z-10 w-full md:w-2/3">
                    <h3 className="text-2xl font-bold text-white mb-2 tracking-tight drop-shadow-md">Find Anything</h3>
                    <p className="text-[15px] text-zinc-400 leading-relaxed font-medium">
                      Search through thousands of projects effortlessly. We sort through the raw developer jargon so you only see what matters.
                    </p>
                  </div>
                </motion.div>

                {/* Feature 2: One-Click (Span 4 columns) */}
                <motion.div 
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="md:col-span-4 will-change-transform group relative flex flex-col justify-end h-[360px] overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-[#0a151a] to-[#04090b] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.5),inset_0_1px_5px_rgba(255,255,255,0.05)]"
                >
                  {/* Custom UI Art: Spinning Deploy Ring */}
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 w-32 h-32">
                    <div className="absolute inset-0 rounded-full border-[3px] border-dashed border-blue-500/30 animate-[spin_10s_linear_infinite] group-hover:border-blue-400/80 transition-colors duration-500" />
                    <div className="absolute inset-2 rounded-full border-2 border-cyan-400/20 animate-[spin_7s_linear_infinite_reverse]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                        <div className="h-4 w-4 bg-white rounded-sm drop-shadow-[0_0_5px_white]" />
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 text-center">
                    <h3 className="text-xl font-bold text-white mb-2 tracking-tight drop-shadow-md">One-Click Play</h3>
                    <p className="text-[14px] text-zinc-400 leading-relaxed font-medium">
                      Tap a single button to launch. Downloads, setups, and backgrounds tasks map out automatically.
                    </p>
                  </div>
                </motion.div>

                {/* Feature 3: Safe & Simple (Span 12 columns, horizontal) */}
                <motion.div 
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="md:col-span-12 will-change-transform group relative flex flex-col md:flex-row items-center justify-between overflow-hidden rounded-[32px] border border-white/10 bg-[#061014] p-8 md:p-10 shadow-[0_20px_40px_rgba(0,0,0,0.5),inset_0_1px_5px_rgba(255,255,255,0.05)]"
                >
                  <div className="absolute -left-32 -bottom-32 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/20 transition-colors duration-700" />
                  
                  <div className="relative z-10 md:w-1/2 mb-8 md:mb-0">
                    <h3 className="text-3xl font-bold text-white mb-3 tracking-tight drop-shadow-md">Clean Environment</h3>
                    <p className="text-[16px] text-zinc-400 leading-relaxed font-medium max-w-md">
                      Everything runs securely isolated in the background. If you don't like an app, delete it with one click. Simple, safe, and entirely effortless.
                    </p>
                  </div>

                  {/* Custom UI Art: Shield / Abstract Geometry */}
                  <div className="relative z-10 w-full md:w-1/2 h-[160px] flex justify-center md:justify-end items-center pr-0 md:pr-10">
                    <div className="relative w-[280px] h-20 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-between px-6 overflow-hidden group-hover:border-emerald-400/30 transition-colors duration-500">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s] ease-in-out" />
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-[#112429] flex items-center justify-center border border-emerald-500/20">
                            <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
                         </div>
                         <div className="flex flex-col gap-1">
                           <div className="w-20 h-2 bg-emerald-500/40 rounded-full" />
                           <div className="w-12 h-2 bg-zinc-700/50 rounded-full" />
                         </div>
                      </div>
                      <div className="w-14 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-emerald-400 uppercase">Secure</span>
                      </div>
                    </div>
                  </div>
                    
                </motion.div>

              </div>
            </div>
          </section>

          {/* ── PRICING SECTION ── */}
          <section id="pricing" className="mt-16 px-6 pb-32 w-full flex justify-center">
            <div className="max-w-4xl w-full">
              <div className="relative rounded-[40px] border border-white/10 bg-[#0d161c]/80 p-10 md:p-16 overflow-hidden backdrop-blur-2xl shadow-[0_40px_80px_rgba(0,0,0,0.6)] text-center">
                {/* Glow behind card content */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[300px] bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-[100px]" />
                
                <h2 className="relative z-10 text-4xl md:text-5xl font-extrabold text-white mb-6">
                  It's Open Source.<br/>
                  <span className="text-cyan-400">It's 100% Free.</span>
                </h2>
                <p className="relative z-10 text-lg text-gray-400 max-w-xl mx-auto mb-10">
                  No hidden fees, no subscriptions, and no limits. The world of open source was meant to be free, and we're keeping it that way forever.
                </p>
                <button
                  onClick={() => openAuthModal("signup_prompt")}
                  className="relative z-10 inline-flex h-[56px] items-center justify-center gap-2 rounded-full bg-white px-10 text-[16px] font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all hover:scale-105 active:scale-[0.98]"
                >
                  Get Started Now
                </button>
              </div>
            </div>
          </section>

        </div>
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

            {/* ── For You Section ── */}
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

                {/* ── Featured Strip: top 3 as visual cards ── */}
                {forYouRepos.length >= 3 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {forYouRepos.slice(0, 3).map((repo, idx) => (
                      <div key={`featured-${repo.id}`} onClick={() => handleRepoView(repo)} className="cursor-pointer">
                        <RepoCard repo={repo} onRun={handleRunRepo} variant="market-card" showPrice={false}
                          badge={idx === 0 ? "🏆 #1 Pick" : idx === 1 ? "⚡ Hot" : "✨ New"} />
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Remaining repos as clean icon-row list ── */}
                <div className="grid grid-cols-1 gap-x-8 gap-y-2 lg:grid-cols-2">
                  {forYouRepos.slice(3).map((repo) => (
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

                    {/* ── Featured Strip: top 3 visual cards ── */}
                    {!isInSearchMode && visibleRepos.length >= 3 && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {visibleRepos.slice(0, 3).map((repo, idx) => (
                          <div key={`fp-${repo.id}`} onClick={() => handleRepoView(repo)} className="cursor-pointer">
                            <RepoCard repo={repo} onRun={handleRunRepo} variant="market-card" showPrice={false}
                              badge={idx === 0 ? "🏆 #1 Pick" : idx === 1 ? "⚡ Hot" : "✨ New"} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Remaining repos as clean icon-row list ── */}
                    <div className="grid grid-cols-1 gap-x-8 gap-y-2 lg:grid-cols-2">
                      {(isInSearchMode ? visibleRepos : visibleRepos.slice(3)).map((repo) => (
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
